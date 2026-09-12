from edge.camera.video_source import VideoSource
from edge.perception.detector import Detector
from edge.tracking.tracker import Tracker
from edge.events.event_manager import EventManager


VIDEO_PATH = "C:/Users/acer/Desktop/CityLens/data/videos/pothole_test.mp4"
MODEL_PATH = "C:/Users/acer/Desktop/CityLens/ml/Potholes_Yolo26n/models/yolo26n_pothole_80e.pt"


def main():
    video = VideoSource(VIDEO_PATH)
    detector = Detector(MODEL_PATH)
    tracker = Tracker()
    event_manager = EventManager(min_frames=3)

    frame_number = 0

    try:
        while True:
            frame = video.read()

            if frame is None:
                break

            frame_number += 1

            detections = detector.detect(frame)
            tracked_detections = tracker.update(detections)

            confirmed_events = event_manager.process(
                tracked_detections
            )

            for event in confirmed_events:
                print(
                    f"\nEVENT CONFIRMED | "
                    f"Frame: {frame_number} | "
                    f"Track ID: {event['track_id']} | "
                    f"Class: {event['class']} | "
                    f"Confidence: {event['confidence']:.2f}"
                )

    finally:
        video.release()


if __name__ == "__main__":
    main()