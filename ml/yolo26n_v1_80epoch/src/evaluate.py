import json
from pathlib import Path
from .model import get_model

def evaluate(weights="weights/best.pt", data="data.yaml", imgsz=640, split="val", out="metrics_run.json"):
    v = get_model(weights).val(data=data, imgsz=imgsz, split=split, verbose=False)
    d = {"mAP50": round(float(v.box.map50),4), "mAP50-95": round(float(v.box.map),4),
         "P": round(float(v.box.mp),4), "R": round(float(v.box.mr),4)}
    print(d)
    Path(out).write_text(json.dumps(d, indent=2))
    return d
