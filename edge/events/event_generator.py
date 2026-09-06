import time
from datetime import datetime, timezone


class EventGenerator:
    def __init__(self, bus_id, camera_id, cooldown_seconds=5):
        self.bus_id = bus_id
        self.camera_id = camera_id
        self.cooldown_seconds = cooldown_seconds

        self.last_event_time = {}

    def generate_event(self, detection, latitude, longitude):

        event_type = self._get_event_type(detection["class"])
        confidence = detection["confidence"]

        current_time = time.time()
        # TODO: Replace simple time-based cooldown with proper temporal and spatial
        # deduplication using object/event tracking.
        # Prevent repeated events for the same type
        if event_type in self.last_event_time:
            elapsed = current_time - self.last_event_time[event_type]

            if elapsed < self.cooldown_seconds:
                return None

        self.last_event_time[event_type] = current_time

        severity = self._get_severity(confidence)

        event = {
            "bus_id": self.bus_id,
            "camera_id": self.camera_id,
            "event_type": event_type,
            # TODO: Replace confidence-based severity with a proper severity model
            # based on detection characteristics and domain requirements.
            "confidence": confidence,
            "severity": severity,
            # TODO: Use the video/frame timestamp so event time stays synchronized
            # with the simulated GPS timeline.
            "detected_at": datetime.now(timezone.utc).isoformat(),
            "latitude": latitude,
            "longitude": longitude,
            "metadata": {
                "bbox": detection.get("bbox")
            }
        }

        return event

    def _get_event_type(self, detection_class):
        event_types = {
            "pothole": "POTHOLE",
            "damaged_road": "DAMAGED_ROAD",
            "waterlogging": "WATERLOGGING",
            "accident": "ACCIDENT"
        }

        if detection_class not in event_types:
            raise ValueError(
                f"Unsupported detection class: {detection_class}"
            )

        return event_types[detection_class]

    def _get_severity(self, confidence):
        if confidence >= 0.90:
            return "HIGH"
        elif confidence >= 0.75:
            return "MEDIUM"
        else:
            return "LOW"