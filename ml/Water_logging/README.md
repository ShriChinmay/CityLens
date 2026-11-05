```markdown
# 💧 Waterlogging Detection — ML Module

A **self-contained waterlogging detector** built with Ultralytics YOLO26n.  
Give it a photo or video, and it detects waterlogged areas on roads (draws boxes + confidence) and returns structured JSON — ready for the CityLens edge pipeline, backend, or dashboard.

> This is the ML side of CityLens.  
> The edge / backend can import and call these functions.  
> You don't need the training code — just this folder.

---

## 📁 What's inside

```
ml/Waterlogging_Yolo26n/
├── models/
│   ├── best.pt                 ← trained weights (recommended)
│   └── best.onnx               ← (optional) for edge / ONNX Runtime
├── predict.py                  ← the module (import this)
├── requirements.txt
└── README.md
```

`predict.py` auto-detects the model: it prefers `.pt` if present, otherwise falls back to `.onnx`.

---

## 🚀 Install

```bash
pip install -r requirements.txt
```

Needs: `ultralytics` + `opencv-python` (and `onnxruntime` if you use the `.onnx` version).

---

## ▶️ How to use it

### 1. Detect waterlogging in an image

```python
from predict import predict

result = predict("road.jpg")          # returns a list of detections
print(len(result), "waterlogged areas found")
```

### 2. Detect waterlogging in a video

```python
from predict import predict

report = predict("road.mp4")
print(report["total_detections"])
```

### 3. Add GPS location

```python
from predict import predict

result = predict("road.jpg", gps=(28.6139, 77.2090))
print(result[0]["gps"])               # {'lat': 28.6139, 'lon': 77.209}
```

### 4. Reuse a loaded model (faster for multiple calls)

```python
from predict import WaterloggingPredictor

det = WaterloggingPredictor()         # load once
results = det.predict("road1.jpg")
report  = det.predict_video("road.mp4")
```

---

## 🧮 API Overview

| Function                  | Input              | Returns          | Also saves                  |
|---------------------------|--------------------|------------------|-----------------------------|
| `predict(source)`         | image or video     | list / dict      | annotated file + JSON       |
| `detect(image)`           | one image          | list[dict]       | annotated image + JSON      |
| `detect_video(video)`     | one video          | dict             | annotated video + JSON      |
| `WaterloggingPredictor()` | load model once    | `.predict()` etc | same as above               |

### Common options

```python
predict(
    "road.jpg",
    conf=0.40,          # confidence threshold
    iou=0.70,           # NMS IoU
    imgsz=640,
    output_dir="outputs",
    gps=(lat, lon)      # optional
)
```

---

## 📤 Detection format

```json
{
  "class": "waterlogging",
  "confidence": 0.87,
  "bbox": [104, 167, 347, 286],
  "gps": {"lat": 28.6139, "lon": 77.2090}
}
```

| Field       | Meaning                                      |
|-------------|----------------------------------------------|
| `bbox`      | `[x1, y1, x2, y2]` pixel coordinates         |
| `confidence`| model confidence (0–1)                       |
| `gps`       | only present if you passed `gps=`            |

---

## 🧠 Model details

| Item              | Value                          |
|-------------------|--------------------------------|
| **Architecture**  | YOLO26n (nano)                 |
| **Task**          | Object Detection               |
| **Classes**       | 1 (`waterlogging`)             |
| **Framework**     | Ultralytics 8.4.202            |
| **Training time** | ~10 minutes (A40 GPU)          |
| **Epochs**        | 101                            |
| **Parent model**  | `exp-2`                        |

### Final Metrics (validation)

| Metric       | Value   |
|--------------|---------|
| **mAP@50**   | **93.2%** |
| **mAP@50-95**| **75.4%** |
| **Precision**| **87.0%** |
| **Recall**   | **91.5%** |

```json
{
  "mAP50": 0.9315,
  "mAP50-95": 0.7536,
  "precision": 0.8704,
  "recall": 0.9154,
  "val/box_loss": 1.490,
  "val/cls_loss": 1.542
}
```

---

## 🔌 CityLens Integration

```python
from predict import predict

def handle_frame(image_path, lat, lon, bus_id, camera_id):
    detections = predict(image_path, gps=(lat, lon), conf=0.45)
    
    events = []
    for det in detections:
        events.append({
            "bus_id": bus_id,
            "camera_id": camera_id,
            "event_type": "WATERLOGGING",
            "confidence": det["confidence"],
            "latitude": lat,
            "longitude": lon,
            "metadata": {"bbox": det["bbox"]},
            "severity": "HIGH" if det["confidence"] > 0.8 else "MEDIUM"
        })
    return events
```

---

## ⚠️ Notes

- Default confidence threshold is `0.40`. Raise it (e.g. `0.5`) if you get too many false positives.
- The model path is resolved relative to `predict.py`, so it works from any working directory.
- For edge deployment, prefer the `.onnx` version + ONNX Runtime for lower latency and smaller footprint.
- GPS must be supplied by the caller (bus GPS / device). The model itself does not geolocate.

---
