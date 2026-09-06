"""Full prediction + eval suite (mirrors notebook Cells 5-10)."""
from pathlib import Path
import json
from ultralytics import YOLO

_model = None
def load(weights="weights/best.pt"):
    global _model
    if _model is None:
        _model = YOLO(str(weights))
    return _model

def predict_images(paths, conf=0.4, save_dir="outputs", name="pred"):
    """Like Cell 8 images: returns [{file, boxes:[{bbox,conf}]}]."""
    m = load()
    res = m.predict(source=[str(p) for p in paths], conf=conf,
                    save=True, project=save_dir, name=name, exist_ok=True)
    out = []
    for r in res:
        boxes = []
        if r.boxes is not None:
            for b, c in zip(r.boxes.xyxy.tolist(), r.boxes.conf.tolist()):
                boxes.append({"bbox": [round(x,1) for x in b], "conf": round(float(c),3)})
        out.append({"file": Path(r.path).name, "n": len(boxes), "boxes": boxes})
        print(f"{Path(r.path).name}: {len(boxes)} { [b['conf'] for b in boxes]}")
    return out

def predict_video(path, conf=0.4, save_dir="outputs", name="video"):
    """Like Cell 8 video: 375 frames -> annotated avi."""
    m = load()
    m.predict(source=str(path), conf=conf, save=True,
              project=save_dir, name=name, exist_ok=True)
    import glob
    outs = glob.glob(f"{save_dir}/{name}/*.mp4") + glob.glob(f"{save_dir}/{name}/*.avi")
    print("saved:", outs)
    return outs

def evaluate(data="configs/prod.yaml", weights="weights/best.pt", imgsz=640, split="val"):
    """Like Cell 7: prints + saves metrics.json."""
    import yaml
    d = yaml.safe_load(open(data)) if str(data).endswith(".yaml") else {"train":"train","val":"val"}
    # prod.yaml has no train/val paths -> fall back to data.yaml style
    data_arg = str(data) if "train" in d else "data.yaml"
    m = load(weights)
    v = m.val(data=data_arg, imgsz=imgsz, split=split, verbose=False)
    out = {"mAP50": round(float(v.box.map50),4), "mAP50-95": round(float(v.box.map),4),
           "P": round(float(v.box.mp),4), "R": round(float(v.box.mr),4)}
    print(out)
    Path("metrics_run.json").write_text(json.dumps(out, indent=2))
    return out

def hard_test(val_images_dir, weights="weights/best.pt", conf=0.4):
    """Like hard duel: smallest-box images 816/752/666/846."""
    hard = ["pothole_816.jpg","pothole_752.jpg","pothole_666.jpg","pothole_846.jpg"]
    files = [str(Path(val_images_dir)/h) for h in hard]
    return predict_images(files, conf=conf, save_dir="outputs", name="hard")

if __name__ == "__main__":
    import sys
    src = sys.argv[1] if len(sys.argv)>1 else None
    if src and Path(src).suffix in (".mp4",".avi"):
        predict_video(src)
    elif src:
        predict_images([src])
    else:
        print("usage: python -m app.predict <image|video|folder>")
