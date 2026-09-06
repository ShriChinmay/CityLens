# 🕳️ Pothole YOLO26 — v1 80epoch (SIH prototype)

mAP50 **0.7881** | mAP50-95 0.5236 | P 0.791 | R 0.727 | 640px | yolo26n | 1581 train / 396 val

## Structure
```
src/model.py    load + ONNX export
src/dataset.py  audit, broken-label scan, data.yaml
src/train.py    BEST hypers + train()
src/evaluate.py val → metrics.json
src/predict.py  images / video / hard-test (816/752/666/846)
src/track.py    ByteTrack unique counts
src/export.py   ONNX + benchmark
app/api.py      FastAPI POST /predict
app/ui.py       Gradio demo (share=True)
tests/          quality gates (mAP≥0.75, labels valid)
weights/best.pt 20MB SIH final
```

## Run (local / Colab)
```bash
pip install -r requirements.txt
python -m app.predict test.jpg
python -m app.predict video.mp4
python -m src.evaluate  # val
python app/ui.py        # Gradio
uvicorn app.api:app --port 8000
```

## Docker
```bash
docker build -t pothole26 .
docker run -p 8000:8000 pothole26
```

## Results
| run | mAP50 | P | R |
|-----|-------|---|---|
| 8n 30ep | ~0.68 | — | — |
| 26n 30ep | 0.7906 | 0.778 | 0.722 |
| 26n 80ep | **0.7881** | 0.791 | 0.727 |

Hard: 846 (0→4 boxes @100ep), 666 (4→6), 816 (2→4).
