"""Gradio SIH demo: upload image/video, conf slider."""
import gradio as gr
from src.predict import predict_images, predict_video
from pathlib import Path
import glob

def run(file, conf):
    p = Path(file)
    if p.suffix in (".mp4", ".avi"):
        outs = predict_video(p, conf=conf, save_dir="outputs", name="gradio")
        return outs[0] if outs else None
    out = predict_images([p], conf=conf, save_dir="outputs", name="gradio")
    imgs = sorted(glob.glob("outputs/gradio/*.jpg"))
    return imgs[0] if imgs else None

gr.Interface(run, [gr.File(label="image/video"), gr.Slider(0.1, 0.8, 0.4, label="conf")],
             gr.File(label="result"), title="Pothole YOLO26 (0.788 mAP)").launch(share=True)
