"""FastAPI: POST /predict (image) + /health."""
from fastapi import FastAPI, UploadFile
from fastapi.responses import JSONResponse
from src.predict import predict_images
from pathlib import Path
import tempfile

app = FastAPI(title="pothole-yolo26")

@app.get("/health")
def health(): return {"ok": True, "model": "yolo26n_v1_80epoch", "mAP50": 0.7881}

@app.post("/predict")
async def predict(file: UploadFile, conf: float = 0.4):
    tmp = Path(tempfile.gettempdir()) / file.filename
    tmp.write_bytes(await file.read())
    out = predict_images([tmp], conf=conf, save_dir="outputs", name="api")
    return JSONResponse(out[0])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
