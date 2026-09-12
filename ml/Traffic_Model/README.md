# 🚗 Indian Road Vehicle Detection — Model Weights

A **fine-tuned YOLO26n model** trained specifically for Indian road traffic conditions. Detects 14 distinct Indian vehicle categories (auto-rickshaws, bikes, tempos/*Chota Hathi*, totos, buses, trucks, etc.) with bounding boxes, labels, and confidence scores.

> This repository contains the **trained model weights** (`best.pt` and `best.onnx`). Downstream tasks (tracking, counting, speed estimation, traffic congestion metrics) consume detections directly from these weights.

---

## 📁 What's inside

```
.
├── best.pt            ← trained weights for PyTorch / Ultralytics (5.1 MB)
├── best.onnx          ← optimized weights for ONNX Runtime / Edge (9.7 MB)
├── requirements.txt   ← dependencies
└── README.md
```

---

## 🚀 Install

```bash
pip install -r requirements.txt
```

Or install standalone:

```bash
pip install ultralytics
# or for ONNX runtime only (no PyTorch needed):
pip install onnxruntime opencv-python
```

---

## ▶️ Usage

### Python (Ultralytics)

```python
from ultralytics import YOLO

# Load model
model = YOLO("best.pt")

# Run detection
results = model("traffic.jpg", conf=0.25)
```

### ONNX Runtime

```python
import onnxruntime as ort

# Load ONNX model for CPU / Edge
session = ort.InferenceSession("best.onnx")
```

---

## 📤 Output Format

When running inference, each detected vehicle gives:

| Field | Example | Meaning |
|---|---|---|
| **Coordinates** (`box.xyxy`) | `[104, 167, 248, 386]` | Bounding box pixel coords `[x1, y1, x2, y2]` (top-left, bottom-right) |
| **Confidence** (`box.conf`) | `0.94` | Detection confidence (`0.0` to `1.0`) |
| **Class ID** (`box.cls`) | `8` | Class index (0 to 13) |
| **Class Label** (`model.names[cls]`) | `"auto-rickshaw"` | Human-readable vehicle name |

---

## 🏷️ Supported Classes (14 Categories)

| Class ID | Label | Description / Indian Road Context |
|:---:|---|---|
| `0` | `trak` | Heavy freight trucks, lorries |
| `1` | `cyclist` | Bicycle riders |
| `2` | `bike` | Motorcycles, scooters, 2-wheelers |
| `3` | `tempo` | Mini commercial trucks (*Tata Ace* / *Chota Hathi*) |
| `4` | `car` | Hatchbacks, sedans, SUVs |
| `5` | `zeep` | Jeeps, Boleros, utility vehicles |
| `6` | `toto` | East India / Bengal battery e-rickshaws |
| `7` | `e-rickshaw` | Electric 3-wheeler passenger rickshaws |
| `8` | `auto-rickshaw` | Traditional 3-wheeler auto / Bajaj tuk-tuk |
| `9` | `bus` | City transit and state transport buses |
| `10` | `van` | Passenger & cargo vans (Maruti Omni, Eeco) |
| `11` | `cycle-rickshaw` | Traditional pedal cycle rickshaws |
| `12` | `person` | Pedestrians |
| `13` | `taxi` | Commercial cabs / city taxis |

---

## 🧠 Model Specifications

| Property | Value |
|---|---|
| **Base Architecture** | YOLO26n (Nano — anchor-free, real-time detector) |
| **Dataset** | IRUVD (Indian Road Urban Vehicle Dataset) |
| **Training Split** | 4,000 real Indian road frames (3,200 Train / 800 Val) |
| **Input Resolution** | 640 × 640 (dynamic shapes supported in ONNX) |
| **Classes** | 14 Indian vehicle & road classes |
| **CPU Latency** | ~30 ms / frame (~30+ FPS on standard CPU) |

### Available Formats

| Format | Size | Runtime | Recommended For |
|---|---|---|---|
| `best.pt` | 5.1 MB | PyTorch (`ultralytics`) | Python backend, fine-tuning, experimentation |
| `best.onnx` | 9.7 MB | ONNX Runtime / OpenCV DNN | Edge devices (Raspberry Pi, Jetson), C++, Go, Web |

---

## ⚙️ Downstream Integration Notes

- **Pure Object Detection:** The model outputs standard 2D bounding boxes (`[x1, y1, x2, y2]`), class IDs, and confidence scores.
- **Analytics & Tracking:** Vehicle counting, trajectory tracking (ByteTrack / DeepSORT), speed estimation, and congestion index calculations are computed downstream by analyzing detections across frames.
- **Confidence Setting:** Recommended confidence threshold is `conf=0.25` for general traffic and `conf=0.35`–`0.40` for dense or cluttered scenes to minimize false positives.
