import shutil
import uuid
from pathlib import Path

from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from .database import init_db, get_db, ProductStandardMap
from . import rag, ocr_service

app = FastAPI(title="BIS Assistant API")

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@app.on_event("startup")
def on_startup():
    init_db()


class ChatRequest(BaseModel):
    question: str


class ProductQuery(BaseModel):
    description: str


@app.post("/chat")
def chat(req: ChatRequest):
    """Open-ended Q&A over ingested IS standards / scheme text, with citations."""
    try:
        return rag.answer_question(req.question)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/recommend-standard")
def recommend_standard(req: ProductQuery, db: Session = Depends(get_db)):
    """Structured lookup first (reliable), falls back to RAG chat if no match.
    This is the 'guided, not generic' differentiator - keyword-match against
    a curated product->standard table before trusting free-text similarity."""
    desc = req.description.lower()
    matches = (
        db.query(ProductStandardMap)
        .filter(ProductStandardMap.product_keyword.ilike(f"%{desc}%"))
        .all()
    )
    if not matches:
        # fall back to RAG for an explanatory answer, flagged as unverified
        rag_result = rag.answer_question(
            f"What Indian Standard and BIS scheme applies to: {req.description}?"
        )
        rag_result["structured_match"] = False
        return rag_result

    return {
        "structured_match": True,
        "results": [
            {"standard": m.is_standard, "scheme": m.scheme, "notes": m.notes}
            for m in matches
        ],
    }


@app.post("/verify-hallmark")
async def verify_hallmark(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Consumer-side: upload a photo of the engraved hallmark, get HUID lookup."""
    ext = Path(file.filename).suffix or ".jpg"
    save_path = UPLOAD_DIR / f"{uuid.uuid4()}{ext}"
    with save_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    result = ocr_service.verify_hallmark_image(db, str(save_path))
    return result


@app.get("/health")
def health():
    return {"status": "ok"}
