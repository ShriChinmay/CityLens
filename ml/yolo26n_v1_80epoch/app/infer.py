"""Thin SIH demo API over src/."""
from src.predict import predict_images, predict_video
from src.evaluate import evaluate
__all__ = ["predict_images", "predict_video", "evaluate"]
