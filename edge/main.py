import time

from edge.camera.video_source import VideoSource
from edge.perception.detector import Detector
from edge.tracking.tracker import Tracker
from edge.events.event_manager import EventManager
from edge.events.event_generator import EventGenerator
from edge.gps.simulator import GPSSimulator
from edge.storage.local_store import LocalStore
from edge.communication.mqtt_client import MQTTClient


# --------------------------------------------------
# Configuration
# --------------------------------------------------

VIDEO_PATH = r"C:\Users\acer\Desktop\CityLens\data\videos\pothole_test.mp4"
MODEL_PATH = "ml/Potholes_Yolo26n/models/yolo26n_pothole_80e.pt"

BUS_ID = 1
CAMERA_ID = 1

START_LAT = 28.6139
START_LON = 77.2090

END_LAT = 28.6200
END_LON = 77.2150

# Number of seconds represented by the video.
# Adjust this once we connect this to the actual video duration.
GPS_DURATION = 60

MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_TOPIC = "citylens/events"


# --------------------------------------------------
# Initialize components
# --------------------------------------------------

video = VideoSource(VIDEO_PATH)

detector = Detector(MODEL_PATH)

tracker = Tracker()

event_manager = EventManager(
    min_frames=3
)

event_generator = EventGenerator(
    bus_id=BUS_ID,
    camera_id=CAMERA_ID
)

gps = GPSSimulator(
    start_lat=START_LAT,
    start_lon=START_LON,
    end_lat=END_LAT,
    end_lon=END_LON,
    duration=GPS_DURATION
)

store = LocalStore()

mqtt = MQTTClient(
    broker=MQTT_BROKER,
    port=MQTT_PORT,
    topic=MQTT_TOPIC
)


# --------------------------------------------------
# Connect MQTT
# --------------------------------------------------

try:
    mqtt.connect()
    mqtt_connected = True

except Exception as e:
    print(f"MQTT connection failed: {e}")
    print("Events will be stored locally.")
    mqtt_connected = False


# --------------------------------------------------
# Video information
# --------------------------------------------------

fps = video.cap.get(5)

if fps <= 0:
    fps = 30.0

frame_number = 0


# --------------------------------------------------
# Main processing loop
# --------------------------------------------------

try:

    while True:

        frame = video.read()

        if frame is None:
            break

        frame_number += 1

        # ------------------------------------------
        # 1. Detection
        # ------------------------------------------

        detections = detector.detect(frame)

        # ------------------------------------------
        # 2. Tracking
        # ------------------------------------------

        tracked_detections = tracker.update(
            detections
        )

        # ------------------------------------------
        # 3. Event confirmation
        # ------------------------------------------

        confirmed_detections = event_manager.process(
            tracked_detections
        )

        # ------------------------------------------
        # 4. GPS position
        # ------------------------------------------

        elapsed_time = frame_number / fps

        latitude, longitude = gps.get_location(
            elapsed_time
        )

        # ------------------------------------------
        # 5. Generate events
        # ------------------------------------------

        for detection in confirmed_detections:

            event = event_generator.generate_event(
                detection=detection,
                latitude=latitude,
                longitude=longitude
            )

            if event is None:
                continue

            print()
            print("EVENT GENERATED")
            print(
                f"Frame: {frame_number} | "
                f"Track ID: {detection['track_id']}"
            )
            print(event)

            # --------------------------------------
            # 6. Save locally
            # --------------------------------------

            event_id = store.save_event(event)

            print(
                f"Saved locally with ID: {event_id}"
            )

            # --------------------------------------
            # 7. Publish to MQTT
            # --------------------------------------

            if mqtt_connected:

                try:

                    success = mqtt.publish_event(
                        event
                    )

                    if success:
                        store.mark_uploaded(
                            event_id
                        )

                        print(
                            f"Event {event_id} "
                            "marked as uploaded."
                        )

                except Exception as e:

                    print(
                        f"MQTT publish failed: {e}"
                    )

                    print(
                        "Event remains pending locally."
                    )


finally:

    # ----------------------------------------------
    # Cleanup
    # ----------------------------------------------

    video.release()

    store.close()

    if mqtt_connected:

        try:
            mqtt.disconnect()

        except Exception:
            pass

    print()
    print("CityLens edge pipeline stopped.")