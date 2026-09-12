from edge.events.event_manager import EventManager
from edge.events.event_generator import EventGenerator
from edge.gps.simulator import GPSSimulator
from edge.storage.local_store import LocalStore


manager = EventManager(min_frames=3)

generator = EventGenerator(
    bus_id=1,
    camera_id=1
)

gps = GPSSimulator(
    start_lat=28.6139,
    start_lon=77.2090,
    end_lat=28.6200,
    end_lon=77.2150,
    duration=10
)

store = LocalStore("test_citylens.db")


frames = [
    [
        {
            "track_id": 1,
            "class": "pothole",
            "confidence": 0.80,
            "bbox": [100, 100, 200, 200]
        }
    ],

    [
        {
            "track_id": 1,
            "class": "pothole",
            "confidence": 0.85,
            "bbox": [105, 105, 205, 205]
        }
    ],

    [
        {
            "track_id": 1,
            "class": "pothole",
            "confidence": 0.90,
            "bbox": [110, 110, 210, 210]
        }
    ]
]


for frame_number, detections in enumerate(frames, start=1):

    confirmed = manager.process(detections)

    elapsed_time = frame_number - 1

    latitude, longitude = gps.get_location(elapsed_time)

    print(f"\nFrame {frame_number}")
    print(f"GPS: {latitude}, {longitude}")

    for detection in confirmed:

        event = generator.generate_event(
            detection,
            latitude,
            longitude
        )

        if event is not None:

            event_id = store.save_event(event)

            print("Generated event:")
            print(event)

            print(f"Saved locally with ID: {event_id}")


print("\nPending events:")

pending_events = store.get_pending_events()

for item in pending_events:
    print(item)


store.close()