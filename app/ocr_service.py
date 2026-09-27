"""
Consumer-side hallmark verification.

Important scope note (be honest about this in your demo/pitch):
  - We CANNOT determine gold purity from a photo - that's a lab assay result.
  - What we CAN do: read the 6-character HUID engraved on the jewellery from
    a photo, then look that code up against a HUID registry. Real BIS lookups
    happen through BIS Care's own database, which isn't a public API - so for
    a demo/hackathon we seed a local mock table (see database.HallmarkRecord)
    and are upfront that production would need a data-sharing tie-up with BIS.

Pipeline: (optional) YOLO crop -> EasyOCR read -> validate format -> DB lookup.
"""
import os
import re
import easyocr
import cv2
from sqlalchemy.orm import Session
from .database import HallmarkRecord
from . import config

_reader = easyocr.Reader(["en"], gpu=config.EASYOCR_GPU)

HUID_PATTERN = re.compile(r"^[A-Z0-9]{6}$")

# Lazily load the trained YOLO detector only if weights exist - lets the app
# still run (falling back to full-image OCR) before you've trained anything.
_detector = None
if os.path.exists(config.HALLMARK_MODEL_PATH):
    from ultralytics import YOLO
    _detector = YOLO(config.HALLMARK_MODEL_PATH)


def _crop_to_hallmark_region(image_path: str) -> str:
    """If a trained detector is available, crop the image to the highest-
    confidence detected hallmark region and save it alongside the original.
    Falls back to returning the original path untouched if no model is
    loaded yet, or if nothing was detected above the confidence threshold."""
    if _detector is None:
        return image_path

    results = _detector.predict(image_path, conf=0.4, verbose=False)
    boxes = results[0].boxes
    if boxes is None or len(boxes) == 0:
        return image_path  # nothing detected - OCR the full image as before

    # take the highest-confidence box
    best = boxes[boxes.conf.argmax()]
    x1, y1, x2, y2 = map(int, best.xyxy[0].tolist())

    img = cv2.imread(image_path)
    crop = img[max(y1, 0):y2, max(x1, 0):x2]
    crop_path = image_path.rsplit(".", 1)[0] + "_crop.jpg"
    cv2.imwrite(crop_path, crop)
    return crop_path


def extract_huid_from_image(image_path: str) -> str | None:
    """Crops to the hallmark region (if a trained model is loaded), then
    runs OCR and returns the first 6-char alphanumeric token that matches
    the HUID format."""
    target_path = _crop_to_hallmark_region(image_path)
    results = _reader.readtext(target_path, detail=0)
    for token in results:
        cleaned = token.strip().upper().replace(" ", "")
        if HUID_PATTERN.match(cleaned):
            return cleaned
    return None


def lookup_huid(db: Session, huid: str) -> dict:
    record = db.query(HallmarkRecord).filter(HallmarkRecord.huid == huid).first()
    if not record:
        return {
            "verified": False,
            "message": "HUID not found in registry. This may be counterfeit, "
                       "mistyped, or misread - double check the engraving and "
                       "cross-verify on the official BIS Care app.",
        }
    return {
        "verified": True,
        "huid": record.huid,
        "purity": record.purity,
        "jeweller_name": record.jeweller_name,
        "hallmarking_centre": record.hallmarking_centre,
        "hallmark_date": str(record.hallmark_date),
        "article_type": record.article_type,
    }


def verify_hallmark_image(db: Session, image_path: str) -> dict:
    huid = extract_huid_from_image(image_path)
    if not huid:
        return {
            "verified": False,
            "message": "Could not read a valid HUID from the image. Try a "
                       "closer, well-lit photo of the engraved mark.",
        }
    result = lookup_huid(db, huid)
    result["huid_read"] = huid
    return result
