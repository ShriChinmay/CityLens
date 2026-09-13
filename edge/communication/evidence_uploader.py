import os

import cv2
import requests


BACKEND_URL = os.getenv(
    "CITYLENS_BACKEND_URL",
    "http://localhost:3000"
)

UPLOAD_ENDPOINT = f"{BACKEND_URL}/api/v1/evidence"


def upload_evidence(frame):
    """
    Upload an OpenCV frame to the CityLens backend.

    Returns:
        str | None:
            Evidence URL returned by the backend,
            or None if the upload fails.
    """

    try:
        success, encoded_image = cv2.imencode(
            ".jpg",
            frame
        )

        if not success:
            print("Failed to encode evidence frame.")
            return None

        response = requests.post(
            UPLOAD_ENDPOINT,
            files={
                "image": (
                    "evidence.jpg",
                    encoded_image.tobytes(),
                    "image/jpeg"
                )
            },
            timeout=5
        )

        response.raise_for_status()

        data = response.json()

        evidence_url = data.get("evidence_url")

        if not evidence_url:
            print(
                "Backend response did not contain evidence_url."
            )
            return None

        print(
            f"Evidence uploaded successfully: {evidence_url}"
        )

        return evidence_url

    except requests.RequestException as error:
        print(f"Evidence upload failed: {error}")
        return None

    except Exception as error:
        print(f"Evidence processing failed: {error}")
        return None