class EventManager:
    def __init__(self, min_frames=3):
        self.min_frames = min_frames

        self.tracks = {}

    def process(self, tracked_detections):
        confirmed_detections = []

        for detection in tracked_detections:
            track_id = detection["track_id"]

            if track_id not in self.tracks:
                self.tracks[track_id] = {
                    "frames_seen": 0,
                    "max_confidence": 0.0,
                    "event_generated": False,
                }

            track = self.tracks[track_id]

            track["frames_seen"] += 1

            track["max_confidence"] = max(
                track["max_confidence"],
                detection["confidence"]
            )

            if (
                track["frames_seen"] >= self.min_frames
                and not track["event_generated"]
            ):
                confirmed_detection = detection.copy()

                confirmed_detection["confidence"] = (
                    track["max_confidence"]
                )

                confirmed_detections.append(
                    confirmed_detection
                )

                track["event_generated"] = True

        return confirmed_detections