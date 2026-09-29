"""
HUID / CM-L code recognition using PaddleOCR-VL-1.6 (Hugging Face).

Install:
    pip install "transformers>=5.0.0" torch pillow

Model card: https://huggingface.co/PaddlePaddle/PaddleOCR-VL-1.6
"""

import re
import torch
from PIL import Image
from transformers import AutoProcessor, AutoModelForImageTextToText

MODEL_PATH = "PaddlePaddle/PaddleOCR-VL-1.6"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Patterns from your spec
HUID_PATTERN = re.compile(r"\b[A-Z0-9]{6}\b")
CML_PATTERN = re.compile(r"CM/L-?\d{7,10}", re.IGNORECASE)

# Load once, reuse across requests (don't reload per image in production)
_model = None
_processor = None


def load_model():
    global _model, _processor
    if _model is None:
        _processor = AutoProcessor.from_pretrained(MODEL_PATH, trust_remote_code=True)
        _model = AutoModelForImageTextToText.from_pretrained(
            MODEL_PATH, trust_remote_code=True, dtype=torch.bfloat16
        ).eval().to(DEVICE)
    return _model, _processor


def run_ocr(image_path: str) -> str:
    """Runs the VLM on the image and returns raw recognized text."""
    model, processor = load_model()
    img = Image.open(image_path).convert("RGB")

    messages = [{
        "role": "user",
        "content": [
            {"type": "image", "image": img},
            {"type": "text", "text": "OCR:"},
        ],
    }]

    inputs = processor.apply_chat_template(
        messages, tokenize=True, add_generation_prompt=True,
        return_dict=True, return_tensors="pt",
    ).to(DEVICE)

    with torch.no_grad():
        output_ids = model.generate(**inputs, max_new_tokens=256)

    return processor.decode(
        output_ids[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True
    ).strip()


def extract_huid(image_path: str) -> str | None:
    """Returns the first 6-char alphanumeric HUID match, or None."""
    text = run_ocr(image_path)
    match = HUID_PATTERN.search(text.upper())
    return match.group(0) if match else None


def extract_cml(image_path: str) -> str | None:
    """Returns the CM/L license number match, or None."""
    text = run_ocr(image_path)
    match = CML_PATTERN.search(text.upper())
    return match.group(0) if match else None


if __name__ == "__main__":
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else "test.png"
    raw = run_ocr(path)
    print("Raw OCR output:", raw)
    print("HUID match:", extract_huid(path))
    print("CM/L match:", extract_cml(path))
