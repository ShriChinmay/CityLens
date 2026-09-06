"""Video tracking with ByteTrack: unique counts, no flicker."""
from .model import get_model

def track_video(path, conf=0.4, save_dir="outputs", name="tracked", weights="weights/best.pt"):
    m = get_model(weights)
    res = m.track(source=str(path), conf=conf, persist=True, tracker="bytetrack.yaml",
                  save=True, project=save_dir, name=name, exist_ok=True)
    ids = set()
    for r in res:
        if r.boxes is not None and r.boxes.id is not None:
            ids.update(int(i) for i in r.boxes.id.tolist())
    print(f"unique potholes: {len(ids)}")
    return len(ids)
