from pathlib import Path
from .model import get_model
from .dataset import hard_files

def _boxes(r):
    out = []
    if r.boxes is not None:
        for b, c in zip(r.boxes.xyxy.tolist(), r.boxes.conf.tolist()):
            out.append({"bbox": [round(x,1) for x in b], "conf": round(float(c),3)})
    return out

def predict_images(paths, conf=0.4, save_dir="outputs", name="pred", weights="weights/best.pt"):
    res = get_model(weights).predict(source=[str(p) for p in paths], conf=conf,
                                     save=True, project=save_dir, name=name, exist_ok=True)
    out = []
    for r in res:
        b = _boxes(r)
        print(f"{Path(r.path).name}: {len(b)} {[x['conf'] for x in b]}")
        out.append({"file": Path(r.path).name, "boxes": b})
    return out

def predict_video(path, conf=0.4, save_dir="outputs", name="video", weights="weights/best.pt"):
    get_model(weights).predict(source=str(path), conf=conf, save=True,
                               project=save_dir, name=name, exist_ok=True)
    import glob
    outs = glob.glob(f"{save_dir}/{name}/*.mp4") + glob.glob(f"{save_dir}/{name}/*.avi")
    print("saved:", outs)
    return outs

def hard_test(val_images_dir, conf=0.4, weights="weights/best.pt"):
    return predict_images(hard_files(val_images_dir), conf=conf, name="hard", weights=weights)
