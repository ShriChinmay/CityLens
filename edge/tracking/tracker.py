class Tracker:
    def __init__(self, iou_threshold=0.3, max_missing=5):
        self.iou_threshold = iou_threshold
        self.max_missing = max_missing

        self.next_track_id = 1
        self.tracks = {}

    def update(self, detections):
        updated_tracks = {}
        used_track_ids = set()

        # Try to match every detection to an existing track
        for detection in detections:
            best_track_id = None
            best_iou = 0.0

            for track_id, track in self.tracks.items():

                # A track can only be matched once per frame
                if track_id in used_track_ids:
                    continue

                # Do not match different object classes
                if detection["class"] != track["class"]:
                    continue

                iou = self._calculate_iou(
                    detection["bbox"],
                    track["bbox"]
                )

                if iou > best_iou:
                    best_iou = iou
                    best_track_id = track_id

            # Existing track found
            if best_track_id is not None and best_iou >= self.iou_threshold:
                track_id = best_track_id

            # No suitable existing track
            else:
                track_id = self.next_track_id
                self.next_track_id += 1

            detection_with_id = detection.copy()
            detection_with_id["track_id"] = track_id

            updated_tracks[track_id] = {
                **detection_with_id,
                "missing": 0,
            }

            used_track_ids.add(track_id)

        # Keep unmatched tracks alive for a few frames
        for track_id, track in self.tracks.items():

            if track_id in used_track_ids:
                continue

            missing_count = track.get("missing", 0) + 1

            if missing_count <= self.max_missing:
                updated_tracks[track_id] = {
                    **track,
                    "missing": missing_count,
                }

        self.tracks = updated_tracks

        # Only return tracks that were detected in the current frame
        current_tracks = []

        for track in self.tracks.values():
            if track.get("missing", 0) == 0:
                current_tracks.append(track)

        return current_tracks

    @staticmethod
    def _calculate_iou(box1, box2):
        x1 = max(box1[0], box2[0])
        y1 = max(box1[1], box2[1])

        x2 = min(box1[2], box2[2])
        y2 = min(box1[3], box2[3])

        intersection_width = max(0, x2 - x1)
        intersection_height = max(0, y2 - y1)

        intersection_area = (
            intersection_width * intersection_height
        )

        box1_width = max(0, box1[2] - box1[0])
        box1_height = max(0, box1[3] - box1[1])

        box2_width = max(0, box2[2] - box2[0])
        box2_height = max(0, box2[3] - box2[1])

        box1_area = box1_width * box1_height
        box2_area = box2_width * box2_height

        union_area = (
            box1_area +
            box2_area -
            intersection_area
        )

        if union_area <= 0:
            return 0.0

        return intersection_area / union_area