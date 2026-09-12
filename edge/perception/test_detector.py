import cv2

from edge.camera.video_source import VideoSource
from edge.perception.detector import Detector


VIDEO_PATH = "data/videos/pothole_test.mp4"
MODEL_PATH = "ml/Potholes_Yolo26n/models/yolo26n_pothole_80e.pt"


video = VideoSource(VIDEO_PATH)
detector = Detector(MODEL_PATH)


frame_number = 0

while True:
    frame = video.read()

    if frame is None:
        break

    frame_number += 1

    # Only inspect every 150th frame
    if frame_number % 150 != 0:
        continue

    detections = detector.detect(frame)

    for detection in detections:
        x1, y1, x2, y2 = detection["bbox"]
        confidence = detection["confidence"]

        cv2.rectangle(
            frame,
            (x1, y1),
            (x2, y2),
            (0, 255, 0),
            2
        )

        cv2.putText(
            frame,
            f"pothole {confidence:.2f}",
            (x1, y1 - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (0, 255, 0),
            2
        )

    cv2.imwrite(
        f"data/detection_test_frame_{frame_number}.jpg",
        frame
    )

    print(
        f"Saved annotated frame {frame_number} "
        f"with {len(detections)} detections"
    )

video.release()