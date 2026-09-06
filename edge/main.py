import time

from edge.camera.video_source import VideoSource
from edge.perception.detector import Detector
from edge.gps.simulator import GPSSimulator
from edge.events.event_generator import EventGenerator
from edge.communication.communication_manager import CommunicationManager


VIDEO_PATH = "data/videos/pothole_test.mp4"

BUS_ID = 1
CAMERA_ID = 1


def main():
    # Initialize components
    video = VideoSource(VIDEO_PATH)

    # TODO: Load the production detection model and its configuration.
    detector = Detector()

    gps = GPSSimulator(
        start_lat=28.6139,
        start_lon=77.2090,
        end_lat=28.6200,
        end_lon=77.2200,
        duration=60
    )

    event_generator = EventGenerator(
        bus_id=BUS_ID,
        camera_id=CAMERA_ID
    )
    # TODO: Periodically retry pending events when network connectivity
    # is unavailable or restored.
    communication = CommunicationManager()

    # Connect to MQTT
    communication.connect()

    start_time = time.time()

    try:
        while True:

            # Read frame
            frame = video.read()

            if frame is None:
                break
            # TODO: Use the video's actual frame timestamp instead of wall-clock
            # processing time for accurate GPS/event synchronization.
            # Calculate elapsed video-processing time
            elapsed_time = time.time() - start_time

            # Get GPS location
            latitude, longitude = gps.get_location(elapsed_time)

            # Run detection
            # TODO: Add object/event tracking before event generation.
            detections = detector.detect(frame)

            # Generate and send events
            for detection in detections:

                event = event_generator.generate_event(
                    detection,
                    latitude,
                    longitude
                )

                if event is not None:
                    communication.send_event(event)

                    print("Event generated:")
                    print(event)

                    

    finally:
        video.release()
        communication.close()


if __name__ == "__main__":
    main()