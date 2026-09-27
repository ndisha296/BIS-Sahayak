# BIS Assistant - Backend Scaffold

A guided (not generic) assistant: structured product->standard lookup first,
RAG chat for open questions, and consumer-side hallmark HUID verification.

## Setup (Windows/Linux, tested against an 8GB VRAM GPU like the RTX 5050)

```bash
python -m venv venv
venv\Scripts\activate          # or: source venv/bin/activate on Linux/Mac
pip install -r requirements.txt
cp .env.example .env           # then fill in ONE free API key (see below)
```

## Get a free LLM API key (pick one, set LLM_PROVIDER in .env to match)

- **Groq** (recommended - fast, generous free tier): https://console.groq.com
- **Google AI Studio (Gemini)**: https://aistudio.google.com/app/apikey
- **OpenRouter** (free models available): https://openrouter.ai/keys

No key costs money at these free tiers. No GPU needed for the LLM call itself
since it runs on the provider's servers - your 5050 is only doing local
embeddings + OCR + detection.

## Seed demo data and run

```bash
python seed_data.py     # loads sample product-standard rows, mock HUID registry, RAG docs
uvicorn app.main:app --reload
```

Visit http://127.0.0.1:8000/docs for interactive Swagger UI to test all
three endpoints immediately.

## Endpoints

- `POST /chat` - `{"question": "..."}` -> RAG answer with citations
- `POST /recommend-standard` - `{"description": "power bank"}` -> structured match or RAG fallback
- `POST /verify-hallmark` - multipart file upload (jewellery photo) -> HUID read + registry lookup

## Local model notes for an 8GB VRAM GPU (RTX 5050)

- `sentence-transformers/all-MiniLM-L6-v2` (embeddings) - trivial load, runs fine even on CPU.
- `EasyOCR` - GPU-accelerated by default (`gpu=True` in `ocr_service.py`); comfortably fits 8GB.
- If you later add a `YOLOv8n` detector to crop the hallmark region before OCR
  (recommended once you have a labeled dataset), it trains and infers fine on 8GB.
- Keep the chat LLM on a free API (Groq/Gemini/OpenRouter) rather than local -
  an 8GB card can technically run a 4-bit 7-8B model via Ollama, but response
  quality and demo reliability are much better on the free hosted APIs.

## Training the hallmark-region detector (optional but recommended)

1. Label ~100-200 jewellery photos on roboflow.com (free), drawing a box
   around the hallmark/HUID engraving on each. Export in "YOLOv8" format
   into a `hallmark_dataset/` folder next to this README.
2. Run `python train_yolo.py`. On an 8GB card this takes roughly 10-30
   minutes for 100 epochs of YOLOv8n. If you hit a CUDA out-of-memory
   error, lower `batch` in `train_yolo.py` (try 8, then 4).
3. Copy the resulting `runs/hallmark_detector/weights/best.pt` into the
   project root (same folder as this README).
4. Restart the server (`uvicorn app.main:app --reload`). `ocr_service.py`
   auto-detects `best.pt` and starts cropping to the hallmark region before
   OCR. No other code changes needed - if the weights file isn't there, it
   silently falls back to OCR-ing the full image, so the app never breaks.

## What's still a stub / what to build next

1. Ingest real IS standard text (replace `seed_data.py` sample docs) - see
   bis.gov.in for the standards catalog; scrape/curate abstracts, chunk them
   (~300-500 tokens), and call `rag.add_document()` for each chunk.
2. Expand `ProductStandardMap` with more product keywords - this curated
   table is what makes recommendations reliable, don't rely on RAG alone here.
3. Add a YOLOv8 crop step in `ocr_service.py` before OCR for messier photos
   (see the earlier discussion on Roboflow Universe jewellery datasets to
   bootstrap a small training set).
4. Wire `apscheduler` (already in requirements.txt) to a daily job that scans
   `Certification.expiry_date` and sends reminders at 90/30/7 days out.
5. Swap SQLite for Postgres+pgvector when you outgrow local dev.
