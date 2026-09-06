"""Minimal, self-contained pothole detector — drop-in module for the backend team.

How the backend uses it
-----------------------
    from predict import PotholePredictor

    det = PotholePredictor()                      # loads the model ONCE
    results = det.predict("/path/to/image.jpg")   # -> list of pothole dicts

    # or the even-simpler function form:
    from predict import detect
    results = detect("/path/to/image.jpg")

Both return JSON-friendly data:
    [
        {"class": "pothole", "confidence": 0.87, "bbox": [x1, y1, x2, y2]},
        ...
    ]

Videos:
    stats = det.predict_video("road.mp4")   # writes an annotated mp4 + JSON summary

The model file lives next to this module, so it works no matter which
directory the backend runs it from.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

# Resolve the weights relative to THIS file, so it doesn't matter where the
# backend imports it from.
MODELS_DIR = Path(__file__).parent / "models"
MODEL_PT = MODELS_DIR / "yolo26n_pothole_80e.pt"      # backend (PyTorch)
MODEL_ONNX = MODELS_DIR / "yolo26n_pothole_80e.onnx"  # edge / lightweight (ONNX Runtime)


def default_model_path() -> Path:
    """Prefer the .pt, else fall back to the .onnx (so one folder works everywhere)."""
    if MODEL_PT.is_file():
        return MODEL_PT
    if MODEL_ONNX.is_file():
        return MODEL_ONNX
    raise FileNotFoundError(
        f"No model found in {MODELS_DIR}. Expected {MODEL_PT.name} or {MODEL_ONNX.name}."
    )


DEFAULT_CONF = 0.40
DEFAULT_IOU = 0.70
DEFAULT_IMGSZ = 640

VIDEO_SUFFIXES = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".mpeg", ".mpg", ".wmv", ".ts", ".m4v"}


def _normalize_gps(gps) -> dict[str, float] | None:
    """Turn GPS into ``{'lat':..,'lon':..}`` (plus ``alt`` if given).

    Accepts ``(lat, lon)``, ``(lat, lon, alt)``, or a dict
    ``{"lat":..,"lon":..,"alt":..}``. Returns ``None`` if no usable lat/lon.
    """
    if gps is None:
        return None
    if isinstance(gps, dict):
        if "lat" not in gps or "lon" not in gps:
            return None
        out: dict[str, float] = {"lat": float(gps["lat"]), "lon": float(gps["lon"])}
        alt = gps.get("alt", gps.get("altitude"))
        if alt is not None:
            out["alt"] = float(alt)
        return out
    try:
        vals = list(gps)
    except TypeError:
        return None
    if len(vals) < 2:
        return None
    out = {"lat": float(vals[0]), "lon": float(vals[1])}
    if len(vals) >= 3 and vals[2] is not None:
        out["alt"] = float(vals[2])
    return out


class PotholePredictor:
    """Loads the YOLO model once and detects potholes in images."""

    def __init__(
        self,
        model_path: str | Path | None = None,
        *,
        device: str | int | None = None,
    ) -> None:
        model_path = Path(model_path) if model_path is not None else default_model_path()
        if not model_path.is_file():
            raise FileNotFoundError(
                f"Model weights not found: {model_path}. "
                f"Expected it at 'ml/models/yolo26n_pothole_80e.pt' or '.onnx'."
            )
        from ultralytics import YOLO  # noqa: I001 - imported lazily so `import predict` stays fast

        self.model_path = model_path
        self.model = YOLO(str(model_path))
        self.device = device  # None lets Ultralytics pick GPU if present, else CPU

    def predict(
        self,
        source: str | Path,
        *,
        conf: float = DEFAULT_CONF,
        iou: float = DEFAULT_IOU,
        imgsz: int = DEFAULT_IMGSZ,
        save_dir: str | Path | None = None,
        gps: tuple[float, float] | None = None,
    ) -> list[dict[str, Any]]:
        """Detect potholes in one image. Returns a JSON-friendly list.

        If ``save_dir`` is given, the annotated image(s) are also saved there
        (e.g. ``outputs/predict/img.jpg``).

        If ``gps`` is given as ``(lat, lon)`` (the camera's location, from the
        device), each returned detection also carries ``gps``."""
        source = Path(source)
        if not source.is_file():
            raise FileNotFoundError(f"Input not found: {source}")

        kwargs: dict[str, Any] = {}
        if save_dir is not None:
            # Absolute path keeps the annotated output under save_dir/ regardless
            # of Ultralytics' run-dir nesting (>= 8.4).
            kwargs = {"save": True, "project": str(Path(save_dir).resolve()), "name": "predict", "exist_ok": True}

        results = self.model.predict(
            source=str(source),
            conf=conf,
            iou=iou,
            imgsz=imgsz,
            device=self.device,
            verbose=False,
            **kwargs,
        )

        gps_info = _normalize_gps(gps)
        detections: list[dict[str, Any]] = []
        for result in results:
            if result.boxes is None:
                continue
            for xyxy, score, cls in zip(
                result.boxes.xyxy.tolist(),
                result.boxes.conf.tolist(),
                result.boxes.cls.tolist(),
            ):
                item: dict[str, Any] = {
                    "class": result.names[int(cls)],
                    "confidence": round(float(score), 4),
                    "bbox": [round(float(v), 2) for v in xyxy],
                }
                if gps_info is not None:  # only add GPS if it was provided
                    item["gps"] = gps_info
                detections.append(item)

        # Also write a JSON report next to the annotated image(s).
        if save_dir is not None:
            pred_dir = Path(save_dir).resolve() / "predict"
            pred_dir.mkdir(parents=True, exist_ok=True)
            json_path = pred_dir / f"{source.stem}_detections.json"
            json_path.write_text(
                json.dumps({"source": str(source), "count": len(detections), "detections": detections}, indent=2) + "\n",
                encoding="utf-8",
            )

        return detections

    def predict_video(
        self,
        source: str | Path,
        *,
        conf: float = DEFAULT_CONF,
        iou: float = DEFAULT_IOU,
        imgsz: int = DEFAULT_IMGSZ,
        output_dir: str | Path = "outputs",
        gps: tuple[float, float] | None = None,
    ) -> dict[str, Any]:
        """Detect potholes in a video, save an annotated mp4, and summarize.

        Returns a JSON-friendly dict:
            {
              "video": <path to annotated mp4>,
              "frames": 375,
              "total_potholes": 42,
              "frames_with_potholes": 130,
              "max_in_one_frame": 3,
              "per_frame": [{"frame": 1, "count": 2}, ...],
            }
        """
        source = Path(source)
        if not source.is_file():
            raise FileNotFoundError(f"Input not found: {source}")

        import cv2

        source = Path(source)
        if not source.is_file():
            raise FileNotFoundError(f"Input not found: {source}")

        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        # Read source metadata (fps + frame size) for the output writer.
        cap = cv2.VideoCapture(str(source))
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        if fps <= 0 or math.isnan(fps):  # guard against missing/NaN fps
            fps = 25.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1280
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 720
        cap.release()

        # Create the output writer, falling back from .mp4 to .avi if the
        # machine has no mp4 codec (common on minimal installs).
        stem = source.stem
        out_path = output_dir / f"{stem}_detected.mp4"
        writer = cv2.VideoWriter(str(out_path), cv2.VideoWriter_fourcc(*"mp4v"), float(fps), (width, height))
        if not writer.isOpened():
            out_path = output_dir / f"{stem}_detected.avi"
            writer = cv2.VideoWriter(str(out_path), cv2.VideoWriter_fourcc(*"MJPG"), float(fps), (width, height))
        if not writer.isOpened():
            raise RuntimeError("Could not create a video writer for the annotated output.")

        # stream=True keeps memory flat (no accumulating frames in RAM).
        results = self.model.predict(
            source=str(source),
            conf=conf,
            iou=iou,
            imgsz=imgsz,
            device=self.device,
            stream=True,
            verbose=False,
        )

        gps_info = _normalize_gps(gps)
        per_frame: list[dict[str, Any]] = []
        total = 0
        frames_with = 0
        max_in_one = 0
        frame_count = 0
        for result in results:
            frame_count += 1
            detections = []
            if result.boxes is not None:
                for xyxy, score, cls in zip(
                    result.boxes.xyxy.tolist(),
                    result.boxes.conf.tolist(),
                    result.boxes.cls.tolist(),
                ):
                    item: dict[str, Any] = {
                        "class": result.names[int(cls)],
                        "confidence": round(float(score), 4),
                        "bbox": [round(float(v), 2) for v in xyxy],
                    }
                    if gps_info is not None:
                        item["gps"] = gps_info
                    detections.append(item)
            count = len(detections)
            total += count
            if count:
                frames_with += 1
            max_in_one = max(max_in_one, count)
            per_frame.append({"frame": frame_count, "count": count, "detections": detections})
            writer.write(result.plot())  # BGR annotated frame

        writer.release()

        report = {
            "video": str(out_path) if out_path.is_file() else "",
            "frames": frame_count,
            "total_potholes": total,
            "frames_with_potholes": frames_with,
            "max_in_one_frame": max_in_one,
            "per_frame": per_frame,
        }
        # Write a JSON report with each pothole's details (per frame).
        json_path = output_dir / f"{stem}_detections.json"
        json_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        report["json"] = str(json_path)
        return report


# Convenience: a module-level singleton so backend code can just call detect().
_PREDICTOR: PotholePredictor | None = None


def detect(
    image_path: str | Path,
    *,
    conf: float = DEFAULT_CONF,
    save_dir: str | Path | None = None,
    gps: tuple[float, float] | None = None,
) -> list[dict[str, Any]]:
    """One-call helper: load the model the first time, then reuse it.

    Pass ``gps=(lat, lon)`` to tag each pothole with its location.
    """
    global _PREDICTOR
    if _PREDICTOR is None:
        _PREDICTOR = PotholePredictor()
    return _PREDICTOR.predict(image_path, conf=conf, save_dir=save_dir, gps=gps)


def detect_video(
    video_path: str | Path,
    *,
    conf: float = DEFAULT_CONF,
    output_dir: str | Path = "outputs",
    gps: tuple[float, float] | None = None,
) -> dict[str, Any]:
    """One-call video helper: loads the model once, then reuses it."""
    global _PREDICTOR
    if _PREDICTOR is None:
        _PREDICTOR = PotholePredictor()
    return _PREDICTOR.predict_video(video_path, conf=conf, output_dir=output_dir, gps=gps)


def predict(
    source: str | Path,
    *,
    conf: float = DEFAULT_CONF,
    iou: float = DEFAULT_IOU,
    imgsz: int = DEFAULT_IMGSZ,
    output_dir: str | Path = "outputs",
    save_dir: str | Path | None = None,
    gps: tuple[float, float] | None = None,
) -> list[dict[str, Any]] | dict[str, Any]:
    """Detect potholes in ANY image or video. Auto-detects the input type.

    - Image  -> returns ``list`` of potholes (and saves annotated image + JSON)
    - Video  -> returns ``dict`` summary (and saves annotated video + JSON)

    One call for either:
        from predict import predict
        result = predict("road.jpg")      # image
        result = predict("road.mp4")      # video

    ``output_dir`` (or ``save_dir``) sets where annotated output + JSON go.
    """
    source = Path(source)
    if not source.exists():
        raise FileNotFoundError(f"Input not found: {source}")
    global _PREDICTOR
    if _PREDICTOR is None:
        _PREDICTOR = PotholePredictor()
    dir_out = save_dir if save_dir is not None else output_dir
    if source.is_file() and source.suffix.lower() in VIDEO_SUFFIXES:
        return _PREDICTOR.predict_video(source, conf=conf, iou=iou, imgsz=imgsz, output_dir=dir_out, gps=gps)
    return _PREDICTOR.predict(source, conf=conf, iou=iou, imgsz=imgsz, save_dir=dir_out, gps=gps)


if __name__ == "__main__":  # quick manual test: python predict.py <image>
    import json
    import sys

    if len(sys.argv) < 2:
        raise SystemExit("Usage: python predict.py <image-path>")
    print(json.dumps(detect(sys.argv[1]), indent=2))
