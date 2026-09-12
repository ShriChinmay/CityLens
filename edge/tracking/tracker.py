class Tracker:
    def __init__(self, iou_threshold=0.3):
        self.iou_threshold = iou_threshold

        self.next_track_id = 1
        self.tracks = {}

    def update(self, detections):
        updated_tracks = {}
        used_track_ids = set()

        for detection in detections:
            best_track_id = None
            best_iou = 0

            for track_id, track in self.tracks.items():

                if track_id in used_track_ids:
                    continue

                iou = self._calculate_iou(
                    detection["bbox"],
                    track["bbox"]
                )

                if iou > best_iou:
                    best_iou = iou
                    best_track_id = track_id

            if best_iou >= self.iou_threshold:
                track_id = best_track_id
            else:
                track_id = self.next_track_id
                self.next_track_id += 1

            detection_with_id = detection.copy()
            detection_with_id["track_id"] = track_id

            updated_tracks[track_id] = detection_with_id
            used_track_ids.add(track_id)

        self.tracks = updated_tracks

        return list(updated_tracks.values())

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

        box1_area = (
            (box1[2] - box1[0]) *
            (box1[3] - box1[1])
        )

        box2_area = (
            (box2[2] - box2[0]) *
            (box2[3] - box2[1])
        )

        union_area = (
            box1_area +
            box2_area -
            intersection_area
        )

        if union_area == 0:
            return 0

        return intersection_area / union_area