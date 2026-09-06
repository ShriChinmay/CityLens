# 🚧 Pothole Detection — ML Module

A **self-contained pothole detector**. Give it a photo or a video, it finds the
potholes (draws boxes + confidence) and returns structured JSON — ready for a
backend, a map, or a dashboard.

> This is the **ML side** of the project. The backend imports and calls these
> functions. You don't need the training code — just this folder.

---

## 📁 What's inside

```
ml/
├── models/
│   ├── yolo26n_pothole_80e.pt     ← trained weights (20 MB, for the backend)
│   └── yolo26n_pothole_80e.onnx   ← same model for ONNX Runtime (9.5 MB, edge)
├── predict.py      ← the module (import this)
├── requirements.txt
└── README.md
```

`predict.py` **auto-detects the model**: it uses the `.pt` if present, otherwise
falls back to the `.onnx`. So one file works everywhere (backend + edge).

---

## 🚀 Install

```bash
pip install -r requirements.txt
```

Needs: `ultralytics` + `opencv-python` (and `onnxruntime` if you run the `.onnx`).

---

## ▶️ How to use it (step by step)

### 1. Detect potholes in an image

```python
from predict import predict

result = predict("road.jpg")          # returns a list of potholes
print(len(result), "potholes found")  # e.g. 7
```

### 2. Detect potholes in a video

```python
from predict import predict

report = predict("road.mp4")          # returns a dict summary
print(report["total_potholes"])       # e.g. 3660
```

### 3. Add GPS location

Pass the camera's `(lat, lon)` (or `(lat, lon, alt)`) — each pothole gets tagged:

```python
from predict import predict

result = predict("road.jpg", gps=(28.6139, 77.2090))
print(result[0]["gps"])               # {'lat': 28.6139, 'lon': 77.209}
```

> `gps` is **optional** — if you don't pass it, the JSON is clean (no gps field).
> The model can't know GPS by itself; your app captures it and passes it in.

### 4. Get the JSON / annotated output

`predict()` saves, by default under `outputs/`:

```
# for an image:
outputs/predict/road.jpg              ← annotated image (boxes drawn)
outputs/predict/road_detections.json  ← pothole details

# for a video:
outputs/road_detected.mp4         ← annotated video
outputs/road_detections.json      ← per-frame pothole details
```

Change the location with `output_dir=`:

```python
predict("road.mp4", output_dir="reports")
```

### 5. Reuse a loaded model (faster if you call many times)

```python
from predict import PotholePredictor

det = PotholePredictor()              # load once (slow the first time, fast after)
results = det.predict("road1.jpg")
results = det.predict("road2.jpg")
report  = det.predict_video("road.mp4")
```

---

## 🧮 The API

| Function | Input | Returns | Also saves |
|---|---|---|---|
| `predict(source)` | **image or video** (auto) | `list` (image) or `dict` (video) | annotated file + JSON |
| `detect(image)` | one image | `list[dict]` | annotated image + JSON |
| `detect_video(video)` | one video | `dict` | annotated video + JSON |
| `PotholePredictor()` | load model once | `.predict()` / `.predict_video()` | same as above |

### Options (all functions accept these)

```python
predict("road.jpg", conf=0.5, iou=0.7, imgsz=640, output_dir="outputs", gps=(lat, lon))
```

| Param | Default | What it does |
|---|---|---|
| `conf` | `0.40` | min confidence (higher = fewer false alarms) |
| `iou` | `0.70` | overlap threshold for duplicate boxes |
| `imgsz` | `640` | inference image size |
| `output_dir` | `outputs` | where annotated output + JSON go |
| `gps` | `None` | `(lat, lon)` or `(lat, lon, alt)` — tags each pothole |

---

## 📤 What each detection looks like

```json
{
  "class": "pothole",
  "confidence": 0.80,
  "bbox": [104, 167, 147, 186],
  "gps": {"lat": 28.61, "lon": 77.20, "alt": 231.4}
}
```

| Field | Meaning |
|---|---|
| `bbox` | pixel coords `[left, top, right, bottom]` (where in the image) |
| `confidence` | how sure the model is (0–1) |
| `gps` | lat/lon/alt — only present if you passed `gps=` |

## 📤 The video JSON (extra fields)

```json
{
  "video": "road_detected.mp4",
  "frames": 375,
  "total_potholes": 3660,
  "frames_with_potholes": 375,
  "max_in_one_frame": 17,
  "per_frame": [
    {"frame": 1, "count": 7, "detections": [ ... ]}
  ]
}
```

`per_frame` gives you each frame's potholes — so you can animate them on a map over
time.

---

## 🔌 Backend integration (for the frontend/map)

```python
from predict import predict

def handle_upload(image_path, lat, lon):
    result = predict(image_path, gps=(lat, lon))
    # result = [{"class":"pothole","confidence":..,"bbox":[..],"gps":{..}}, ...]
    return result   # -> send to frontend, drop pins on a map
```

---

## 🧠 Model details

- **Model:** YOLO26n (nano), fine-tuned on potholes
- **Trained for:** 80 epochs
- **Accuracy on unseen data:** mAP@50 **0.788**, precision **0.79**, recall **0.73**
- **Classes:** 1 (`pothole`)

### Formats

| Format | Size | Needs | Use for |
|---|---|---|---|
| `.pt` | 20 MB | PyTorch | backend / server |
| `.onnx` | 9.5 MB | ONNX Runtime | edge / device / lightweight |

`predict.py` auto-picks `.pt` if present, else `.onnx`.

---

## ⚠️ Notes

- Confidence is tuned at `0.40`. Raise it (e.g. `0.5`) for fewer false alarms.
- The model path is resolved relative to `predict.py`, so it works from **any** directory.
- Processing a long video on CPU takes time — use the `.onnx` + GPU/edge for speed.
- `gps` must be passed by the caller (phone/device); the model can't derive it.

---

## 📄 Report / citation

Model trained on the pothole dataset. The training project (`yolo26_final-1/`)
has the full experiment details — metrics, loss curves, weights, and reports.
