"""
Quick CPU-friendly fallback OCR using EasyOCR or pytesseract/OpenCV.
Works reliably without crashing on network or GPU issues.
"""

import re
import os

HUID_PATTERN = re.compile(r"\b[A-Z0-9]{6}\b")
CML_PATTERN = re.compile(r"CM/L-?\d{7,10}", re.IGNORECASE)

_reader = None
_reader_attempted = False


def get_reader():
    global _reader, _reader_attempted
    if _reader_attempted:
        return _reader
    _reader_attempted = True
    try:
        import easyocr
        _reader = easyocr.Reader(["en"], gpu=False)
    except Exception:
        # Gracefully handle missing easyocr, download issues, or unsupported environments
        _reader = None
    return _reader


def run_ocr(image_path: str) -> str:
    if not os.path.exists(image_path):
        return ""
    try:
        reader = get_reader()
        if reader is not None:
            results = reader.readtext(image_path, detail=0)
            if results:
                return " ".join(results)
    except Exception:
        pass
    
    # Optional fallback using pytesseract if installed
    try:
        import pytesseract
        from PIL import Image
        img = Image.open(image_path)
        return pytesseract.image_to_string(img)
    except Exception:
        pass

    return ""


def extract_huid(image_path: str) -> str | None:
    try:
        text = run_ocr(image_path).upper()
        if not text:
            return None
        match = HUID_PATTERN.search(text)
        return match.group(0) if match else None
    except Exception:
        return None


def extract_cml(image_path: str) -> str | None:
    try:
        text = run_ocr(image_path).upper()
        if not text:
            return None
        match = CML_PATTERN.search(text)
        return match.group(0) if match else None
    except Exception:
        return None


if __name__ == "__main__":
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else "test.png"
    raw = run_ocr(path)
    print("Raw OCR output:", raw)
    print("HUID match:", extract_huid(path))
    print("CM/L match:", extract_cml(path))
