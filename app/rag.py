"""
RAG pipeline for the BIS standards chatbot.

Flow:
  1. Embed the user's question (all-MiniLM-L6-v2, runs fine on CPU or the 5050).
  2. Retrieve top-k relevant chunks from Chroma (local, no server needed).
  3. Pass chunks + question to the LLM (Groq/Gemini/OpenRouter - swap via .env).
  4. Return an answer that cites the source clause/standard for each claim.
"""
import chromadb
from sentence_transformers import SentenceTransformer
from . import config

_embedder = SentenceTransformer(config.EMBEDDING_MODEL_NAME)
_chroma_client = chromadb.PersistentClient(path=config.CHROMA_PERSIST_DIR)
_collection = _chroma_client.get_or_create_collection(name="bis_standards")


def embed_text(text: str):
    return _embedder.encode(text).tolist()


def add_document(doc_id: str, text: str, metadata: dict):
    """Call this once per chunk when you ingest IS standards / scheme text into the corpus."""
    _collection.add(
        ids=[doc_id],
        embeddings=[embed_text(text)],
        documents=[text],
        metadatas=[metadata],
    )


def retrieve(query: str, top_k: int = 4):
    results = _collection.query(query_embeddings=[embed_text(query)], n_results=top_k)
    chunks = []
    for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
        chunks.append({"text": doc, "source": meta.get("source", "unknown")})
    return chunks


SYSTEM_PROMPT = """You are a BIS (Bureau of Indian Standards) guidance assistant.
Answer ONLY using the provided context chunks. Every factual claim must be
followed by a citation in the form [Source: <source>]. If the context does not
contain the answer, say you don't have that information and suggest the user
check bis.gov.in directly - do not guess at standard numbers or scheme rules."""


def _call_groq(prompt: str) -> str:
    from groq import Groq
    client = Groq(api_key=config.GROQ_API_KEY)
    resp = client.chat.completions.create(
        model=config.GROQ_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
    )
    return resp.choices[0].message.content


def _call_gemini(prompt: str) -> str:
    import google.generativeai as genai
    genai.configure(api_key=config.GEMINI_API_KEY)
    model = genai.GenerativeModel(config.GEMINI_MODEL, system_instruction=SYSTEM_PROMPT)
    resp = model.generate_content(prompt)
    return resp.text


def _call_openrouter(prompt: str) -> str:
    from openai import OpenAI
    client = OpenAI(api_key=config.OPENROUTER_API_KEY, base_url="https://openrouter.ai/api/v1")
    resp = client.chat.completions.create(
        model=config.OPENROUTER_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
    )
    return resp.choices[0].message.content


_PROVIDERS = {"groq": _call_groq, "gemini": _call_gemini, "openrouter": _call_openrouter}


def answer_question(question: str) -> dict:
    chunks = retrieve(question)
    context = "\n\n".join(f"[{c['source']}] {c['text']}" for c in chunks)
    prompt = f"Context:\n{context}\n\nQuestion: {question}\n\nAnswer with citations:"

    call_fn = _PROVIDERS.get(config.LLM_PROVIDER)
    if call_fn is None:
        raise ValueError(f"Unknown LLM_PROVIDER '{config.LLM_PROVIDER}' - set it in .env")

    answer_text = call_fn(prompt)
    return {"answer": answer_text, "sources": [c["source"] for c in chunks]}
