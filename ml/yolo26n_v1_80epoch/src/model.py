from ultralytics import YOLO

_cfg = {"weights": "weights/best.pt", "_model": None}

def get_model(weights=None):
    if weights: _cfg["weights"] = weights
    if _cfg["_model"] is None:
        _cfg["_model"] = YOLO(str(_cfg["weights"]))
    return _cfg["_model"]

def export_onnx(weights="weights/best.pt", imgsz=640):
    return get_model(weights).export(format="onnx", imgsz=imgsz)
