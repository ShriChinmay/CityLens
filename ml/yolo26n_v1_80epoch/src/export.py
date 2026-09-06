"""ONNX export + benchmark (from notebook Cell 9)."""
from .model import get_model
import time, numpy as np

def export(weights="weights/best.pt", imgsz=640):
    p = get_model(weights).export(format="onnx", imgsz=imgsz)
    print("onnx:", p)
    return str(p)

def benchmark(weights_pt="weights/best.pt", weights_onnx="weights/best.onnx", n=50, imgsz=640):
    import numpy as np
    img = np.zeros((imgsz, imgsz, 3), dtype=np.uint8)
    for w in [weights_pt, weights_onnx]:
        from ultralytics import YOLO
        try:
            m = YOLO(w)
            t0 = time.time()
            for _ in range(n): m.predict(img, verbose=False)
            ms = (time.time()-t0)/n*1000
            print(f"{w}: {ms:.1f} ms/img = {1000/ms:.1f} FPS")
        except Exception as e:
            print(f"{w} skip: {e}")
