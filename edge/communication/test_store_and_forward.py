from edge.storage.local_store import LocalStore
from edge.communication.mqtt_client import MQTTClient


store = LocalStore("test_citylens.db")


# Sample event
event = {
    "bus_id": 1,
    "camera_id": 1,
    "event_type": "POTHOLE",
    "confidence": 0.90,
    "severity": "HIGH",
    "detected_at": "2026-09-12T11:20:00Z",
    "latitude": 28.61512,
    "longitude": 77.2102,
    "metadata": {
        "bbox": [110, 110, 210, 210]
    }
}


# Save event locally first
event_id = store.save_event(event)

print(f"Event saved locally with ID: {event_id}")


mqtt = MQTTClient(
    broker="localhost",
    port=1883,
    topic="citylens/events"
)


mqtt.connect()


# Get pending events
pending_events = store.get_pending_events()

print("\nPending events:")

for item in pending_events:

    event_id = item["id"]
    event = item["event"]

    print(f"\nEvent ID: {event_id}")

    success = mqtt.publish_event(event)

    if success:
        store.mark_uploaded(event_id)
        print(f"Event {event_id} marked as uploaded.")
    else:
        print(f"Event {event_id} remains pending.")


mqtt.disconnect()
store.close()