from edge.events.event_manager import EventManager


manager = EventManager(min_frames=3)


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
    ],

    [
        {
            "track_id": 1,
            "class": "pothole",
            "confidence": 0.88,
            "bbox": [115, 115, 215, 215]
        }
    ]
]


for frame_number, detections in enumerate(frames, start=1):

    events = manager.process(detections)

    print(f"Frame {frame_number}:")
    print(f"Events: {events}")