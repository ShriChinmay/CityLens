import cv2

from evidence_uploader import upload_evidence


IMAGE_PATH = "data/detection_test_frame_150.jpg"


frame = cv2.imread(IMAGE_PATH)

if frame is None:
    raise RuntimeError(f"Could not read image: {IMAGE_PATH}")

print("Uploading test evidence...")

evidence_url = upload_evidence(frame)

if evidence_url:
    print("\nTEST PASSED")
    print(f"Evidence URL: {evidence_url}")
else:
    print("\nTEST FAILED")