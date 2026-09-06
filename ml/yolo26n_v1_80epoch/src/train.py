from .model import get_model

BEST = dict(epochs=100, imgsz=640, batch=16, device=0, patience=20,
            seed=42, optimizer="AdamW", lr0=0.002, cos_lr=True,
            hsv_h=0.015, hsv_s=0.7, hsv_v=0.4, fliplr=0.5,
            mosaic=1.0, mixup=0.1, close_mosaic=10)

def train(data="data.yaml", project="runs", name="pothole_26n", weights="yolo26n.pt", **kw):
    cfg = {**BEST, **kw}
    m = get_model(weights)
    return m.train(data=data, project=project, name=name, exist_ok=True, **cfg)
