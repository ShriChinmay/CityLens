from edge.camera.video_source import VideoSource
from edge.perception.detector import Detector
from edge.tracking.tracker import Tracker


VIDEO_PATH = "data/videos/pothole_test.mp4"
MODEL_PATH = "ml/Potholes_Yolo26n/models/yolo26n_pothole_80e.pt"


video = VideoSource(VIDEO_PATH)
detector = Detector(MODEL_PATH)
tracker = Tracker(iou_threshold=0.3)


frame_number = 0

while True:
    frame = video.read()

    if frame is None:
        break

    frame_number += 1

    # Process every 30th frame
    if frame_number % 3 != 0:
        continue

    detections = detector.detect(frame)

    tracked_detections = tracker.update(detections)

    print(f"\nFrame {frame_number}")

    for detection in tracked_detections:
        print(
            f"Track ID: {detection['track_id']} | "
            f"Confidence: {detection['confidence']:.2f} | "
            f"BBox: {detection['bbox']}"
        )


video.release()