"""
Train a YOLOv8n detector to find the hallmark/HUID region in a jewellery photo.

Prerequisite: export a labeled dataset from Roboflow in "YOLOv8" format and
unzip it next to this script, e.g.:

    bis-assistant/
      hallmark_dataset/
        data.yaml
        train/images, train/labels
        valid/images, valid/labels

Run:  python train_yolo.py

On an 8GB card (RTX 5050), YOLOv8n at imgsz=640 with a ~150 image dataset
takes roughly 10-30 minutes for 100 epochs. If you hit a CUDA out-of-memory
error, lower `batch` below (try 8, then 4).
"""
from ultralytics import YOLO

DATASET_YAML = "hallmark_dataset/data.yaml"   # path to your Roboflow export

model = YOLO("yolov8n.pt")  # starts from Ultralytics' pretrained nano checkpoint

model.train(
    data=DATASET_YAML,
    epochs=100,
    imgsz=640,
    batch=16,          # lower this (8 or 4) if you get a CUDA OOM error
    device=0,           # 0 = first GPU; use "cpu" if no CUDA device found
    patience=20,        # stops early if validation loss plateaus
    project="runs",
    name="hallmark_detector",
)

# After training, your best weights are saved to:
#   runs/hallmark_detector/weights/best.pt
# Copy that file into the bis-assistant/ root (or point HALLMARK_MODEL_PATH
# in app/config.py at it) so ocr_service.py can load it.
print("Done. Copy runs/hallmark_detector/weights/best.pt into your project root.")
