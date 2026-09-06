

class Detector:
    def detect(self, frame):
        """
        Temporary detector used for integration testing.

        Returns a list of detections.
        """
        # TODO: Replace mock detections with trained AI model.
        # TODO: Support the final detection classes and model-specific output format.
        # Simulate a pothole detection
        return [
            {
                "class": "pothole",
                "confidence": 0.93,
                "bbox": [120, 240, 350, 420]
            }
        ]