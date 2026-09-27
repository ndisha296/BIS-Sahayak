# Slim Python base keeps the image smaller; torch/easyocr still make this a
# fairly large image (~2-3GB) - that's normal for an OCR/ML backend.
FROM python:3.11-slim

# System libs OpenCV/EasyOCR need that aren't in the slim image by default.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Match the value in .env / config.py's EASYOCR_GPU default - friends running
# this container almost certainly won't have CUDA set up inside Docker, so
# force CPU mode unless overridden.
ENV EASYOCR_GPU=false

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
