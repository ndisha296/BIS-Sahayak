import os
from dotenv import load_dotenv

load_dotenv()

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "groq")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.1-8b-instruct:free")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./bis_assistant.db")
CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_store")

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"

# Path to your trained YOLOv8 weights (see train_yolo.py). If this file
# doesn't exist, ocr_service.py falls back to running OCR on the full image.
HALLMARK_MODEL_PATH = os.getenv("HALLMARK_MODEL_PATH", "best.pt")

# Set to "true" only on a machine with a working CUDA setup (e.g. your own
# RTX 5050 dev box). Default false so the Docker image works out of the box
# for anyone you share it with, regardless of their GPU.
EASYOCR_GPU = os.getenv("EASYOCR_GPU", "false").lower() == "true"
