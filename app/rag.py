"""
RAG pipeline and regulatory knowledge assistant for the BIS chatbot.

Flow:
  1. Embed the user's question (all-MiniLM-L6-v2, runs on CPU/GPU if Chroma is available).
  2. Retrieve top-k relevant chunks from Chroma.
  3. Query the configured LLM (Groq, Gemini, OpenRouter, xAI Grok).
  4. If external LLM service is offline or rate-limited, provide an intelligent,
     cited BIS regulatory knowledge base fallback.
"""
import os
import re
import json
import urllib.request
import urllib.error
from . import config

_embedder = None
_collection = None
_rag_available = None   # None = not yet checked


def _init_rag():
    """Lazy-initialise chromadb + sentence-transformers on first use."""
    global _embedder, _collection, _rag_available
    if _rag_available is not None:
        return _rag_available
    try:
        import chromadb
        from sentence_transformers import SentenceTransformer
        _embedder = SentenceTransformer(config.EMBEDDING_MODEL_NAME)
        _chroma_client = chromadb.PersistentClient(path=config.CHROMA_PERSIST_DIR)
        _collection = _chroma_client.get_or_create_collection(name="bis_standards")
        _rag_available = True
    except Exception:
        _rag_available = False
    return _rag_available


def embed_text(text: str):
    if not _init_rag() or _embedder is None:
        return []
    try:
        return _embedder.encode(text).tolist()
    except Exception:
        return []


def add_document(doc_id: str, text: str, metadata: dict):
    """Call this once per chunk when you ingest IS standards / scheme text into the corpus."""
    add_documents([(doc_id, text, metadata)])


def add_documents(documents: list[tuple[str, str, dict]]):
    """Upsert a batch of text chunks so repeat corpus imports are idempotent."""
    if not documents or not _init_rag() or _collection is None or _embedder is None:
        return
    try:
        ids, texts, metadatas = zip(*documents)
        embeddings = _embedder.encode(list(texts)).tolist()
        _collection.upsert(
            ids=list(ids),
            embeddings=embeddings,
            documents=list(texts),
            metadatas=list(metadatas),
        )
    except Exception:
        pass


def retrieve(query: str, top_k: int = 4):
    if not _init_rag() or _collection is None:
        return []
    try:
        embeddings = embed_text(query)
        if not embeddings:
            return []
        results = _collection.query(query_embeddings=[embeddings], n_results=top_k)
        chunks = []
        if results and "documents" in results and results["documents"]:
            for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
                source = meta.get("source", "unknown")
                if meta.get("page"):
                    source = f"{source}, page {meta['page']}"
                if meta.get("clause"):
                    source = f"{source}, clause {meta['clause']}"
                chunks.append({"text": doc, "source": source})
        return chunks
    except Exception:
        return []


SYSTEM_PROMPT = """You are BIS Sahayak, the intelligent AI regulatory guidance and standards assistant for the Bureau of Indian Standards (BIS).
You are fully bilingual in English and Hindi.

Key Rules:
1. Language Matching: Always respond in the language the user speaks or types to you. If the user asks in Hindi or Hinglish, answer in polite, clear Hindi (Devanagari script); if in English, answer in professional English.
2. Context Translation: The reference standards and knowledge base may be in English. Accurately translate and explain technical terms, requirements, and testing clauses when answering in Hindi.
3. Conversational & Polite: Handle conversational greetings naturally in both languages (e.g., 'Hello' -> 'Hello! How can I assist you with BIS standards today?', 'नमस्ते' -> 'नमस्ते! 🙏 मैं बीआईएस मानकों, हॉलमार्क और लाइसेंसिंग में आपकी क्या मदद कर सकता हूँ?').
4. Technical & Regulatory Precision: Provide structured, factual guidance for ISI Scheme I, CRS Scheme II, FMCS, Gold Hallmarking (HUID), Form IX renewals, and testing labs.
5. Citations: Cite relevant standards or acts (e.g. [Source: IS 16046], [Source: BIS Act 2016], [Source: Form IX Guidelines]) whenever answering regulatory questions."""


def _call_openrouter(prompt: str) -> str:
    key = config.OPENROUTER_API_KEY
    if not key:
        raise ValueError("OPENROUTER_API_KEY not set")
    url = "https://openrouter.ai/api/v1/chat/completions"
    payload = {
        "model": config.OPENROUTER_MODEL or "meta-llama/llama-3.1-8b-instruct:free",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 1000
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://bis.gov.in",
            "X-Title": "BIS Assistant"
        }
    )
    with urllib.request.urlopen(req, timeout=12) as response:
        result = json.loads(response.read().decode("utf-8"))
        return result["choices"][0]["message"]["content"].strip()


def _call_groq(prompt: str) -> str:
    key = config.GROQ_API_KEY
    if not key:
        raise ValueError("GROQ_API_KEY not set")
    url = "https://api.groq.com/openai/v1/chat/completions"
    payload = {
        "model": config.GROQ_MODEL or "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 1000
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json"
        }
    )
    with urllib.request.urlopen(req, timeout=12) as response:
        result = json.loads(response.read().decode("utf-8"))
        return result["choices"][0]["message"]["content"].strip()


def _call_gemini(prompt: str) -> str:
    key = config.GEMINI_API_KEY
    if not key:
        raise ValueError("GEMINI_API_KEY not set")
    model = config.GEMINI_MODEL or "gemini-2.0-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": f"{SYSTEM_PROMPT}\n\n{prompt}"}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 1000
        }
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=12) as response:
        result = json.loads(response.read().decode("utf-8"))
        return result["candidates"][0]["content"]["parts"][0]["text"].strip()


def _call_xai(prompt: str) -> str:
    key = config.XAI_API_KEY
    if not key:
        raise ValueError("XAI_API_KEY not set")
    url = "https://api.x.ai/v1/chat/completions"
    payload = {
        "model": config.XAI_MODEL or "grok-2-latest",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 1000
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json"
        }
    )
    with urllib.request.urlopen(req, timeout=12) as response:
        result = json.loads(response.read().decode("utf-8"))
        return result["choices"][0]["message"]["content"].strip()


_PROVIDERS = {
    "openrouter": _call_openrouter,
    "groq": _call_groq,
    "gemini": _call_gemini,
    "xai": _call_xai,
}


def _domain_fallback_answer(query: str) -> tuple[str, list[str]]:
    """Intelligent regulatory knowledge engine and conversational fallback."""
    q = query.strip().lower()
    
    # 1. Conversational Greetings
    greeting_patterns = [
        r"^(hi|hello|hey|namaste|pranam|hola|greetings|good\s+morning|good\s+afternoon|good\s+evening|howdy|sup)\b",
        r"^(hi\s+there|hello\s+there|hey\s+bot|hello\s+assistant)"
    ]
    if any(re.search(pat, q) for pat in greeting_patterns) or q in ["hi", "hello", "hey", "namaste"]:
        return (
            "Namaste! 🙏 Hello! I am your AI BIS Regulatory & Standards Assistant.\n\n"
            "I'm here to assist you with all aspects of Bureau of Indian Standards conformity, including:\n\n"
            "1. **IS Standards Discovery**: Find the exact Indian Standard (IS number) for your product.\n"
            "2. **Scheme Guidance**: Understand ISI Mark (Scheme I), CRS (Electronics Scheme II), FMCS, and Gold Hallmarking (HUID).\n"
            "3. **Ask Quotation & Cost Calculation**: Calculate testing fees, marking fees, MSME 50% concessions, and generate quotation estimates.\n"
            "4. **License Expiration & Form IX**: Track renewal countdowns (90/60/30-day alerts) and compliance steps.\n"
            "5. **HUID Verification**: Verify 6-digit laser-engraved hallmark authenticity.\n\n"
            "How can I help you today? You can ask a question or type a product name!",
            ["Bureau of Indian Standards Act 2016", "Manakonline Knowledge Base"]
        )

    # 2. Conversational Help / Identity
    if any(k in q for k in ["who are you", "what can you do", "help me", "what is your name", "how can you help"]):
        return (
            "I am **BIS Sahayak**, your specialized AI compliance co-pilot for Indian regulatory standards.\n\n"
            "Here is what I can do for you:\n"
            "• **Match Products to Standards**: Tell me what you manufacture or import (e.g., *'power bank'*, *'cement'*, *'EV battery'*).\n"
            "• **Explain Certification Schemes**: Learn the step-by-step process for ISI Mark, CRS registration, and Hallmarking.\n"
            "• **Quotation & Cost Estimates**: Use our integrated cost calculator for application, testing, and annual marking fees.\n"
            "• **Locate Testing Facilities**: Find BIS-recognized OSL laboratories and fee schedules across India.\n"
            "• **Renew Licenses**: Get guided checklists for Form IX annual renewals and surveillance audits.\n\n"
            "What would you like to explore?",
            ["Bureau of Indian Standards Act 2016"]
        )

    # 3. Conversational Politeness / Thank you / Goodbye
    if any(k in q for k in ["thank you", "thanks", "thank u", "great job", "awesome", "bye", "goodbye", "see you"]):
        return (
            "You're very welcome! If you have any further questions regarding BIS certification, testing laboratories, or renewal timelines, feel free to ask anytime. Wishing you a smooth compliance journey! 🛡️✨",
            ["BIS Sahayak Portal"]
        )

    # 4. Quotation & Cost Calculation
    if any(k in q for k in ["quotation", "quote", "cost", "fee", "fees", "how much", "price", "calculate", "charges"]):
        return (
            "**BIS Certification & Testing Cost Structure**:\n\n"
            "Total compliance cost typically consists of four components:\n"
            "1. **Application & Processing Fee**: ~₹1,000 to ₹2,000 for domestic schemes.\n"
            "2. **Factory Audit / Inspection Fee**: ~₹7,000 per man-day for ISI Scheme I.\n"
            "3. **Laboratory Testing Charges**: Based on product standard (e.g., ₹15,000 - ₹45,000 for electronics under CRS; ₹25,000 - ₹80,000 for industrial products).\n"
            "4. **Minimum Annual Marking Fee**: Payable upon license grant (covers ongoing market surveillance).\n\n"
            "💡 **MSME / Startup Benefit**: Registered MSMEs with Udyam registration receive a **50% concession** on application and marking fees!\n\n"
            "You can use our **Ask Quotation** and **Cost Calculator** tools in the portal to generate an instant itemized estimate.",
            ["BIS Fee Schedule Regulations 2022", "MSME Concession Policy"]
        )

    # 5. Mandatory & Compulsory Products
    if any(k in q for k in ["mandatory", "compulsory", "products require", "which products", "qco"]):
        return (
            "Under the BIS Act 2016 and Quality Control Orders (QCOs) issued by line ministries, mandatory BIS certification applies to over 600+ products across key sectors:\n\n"
            "1. **Electronics & IT Goods (CRS Scheme II)**: Mobile phones (IS 616 / IS 13252), Power banks (IS 16046), Laptops, LED bulbs (IS 16102), Smartwatches, and Lithium-ion batteries.\n"
            "2. **Critical Industrial & Building Materials (ISI Scheme I)**: Cement (IS 269, IS 1489), Structural steel, Reinforcing TMT bars (IS 1786), and Electrical cables (IS 694).\n"
            "3. **Consumer Safety & Healthcare**: Packaged drinking water (IS 14543), Infant formula, Pressure cookers (IS 2347), and Safety footwear.\n"
            "4. **Precious Metals (Hallmarking Scheme IV)**: Gold jewellery/artefacts (IS 1417) and Silver articles (IS 2112) with mandatory 6-digit HUID in notified districts.\n\n"
            "Manufacturers and importers must secure registration/licence before placing these products in the Indian market.",
            ["Bureau of Indian Standards Act 2016", "Compulsory Registration Scheme (CRS) Gazette", "IS 16046 / IS 1417 / IS 269"]
        )

    # 6. ISI vs CRS
    if any(k in q for k in ["isi", "crs", "difference between isi and crs"]):
        return (
            "The key differences between **ISI Mark (Scheme I)** and **CRS (Compulsory Registration Scheme II)** are:\n\n"
            "- **ISI Mark Scheme I**: Requires initial factory inspection, testing of samples from factory & market, and continuous surveillance audits. Applicable to heavy goods, cement, steel, automotive parts, and food items.\n"
            "- **CRS Scheme II**: Self-declaration of conformity based on laboratory test reports from BIS-recognized OSL labs without mandatory initial factory audits. Applicable to electronics, IT hardware, solar panels, and battery packs.\n"
            "- **Validity & Renewal**: ISI licences are valid for 1-2 years and renewed via Form IX. CRS registrations are granted for 2 years with direct online renewal upon testing compliance.",
            ["BIS Conformity Assessment Regulations 2018 (Scheme I & II)", "Manakonline Scheme Guidelines"]
        )

    # 7. Hallmark & HUID
    if any(k in q for k in ["huid", "hallmark", "6-digit", "gold", "purity"]):
        return (
            "**Hallmark Unique Identification (HUID)** is a 6-digit alphanumeric code laser-engraved on every piece of gold jewellery alongside the BIS mark and purity grade (e.g., 916 for 22K, 750 for 18K, 585 for 14K).\n\n"
            "- **Consumer Verification**: Consumers can enter the 6-character HUID in this portal or the BIS Care app to inspect jeweler registration, Assaying & Hallmarking Centre (AHC) details, and article type.\n"
            "- **Regulation**: Hallmarking is mandatory under the Gold Jewellery and Gold Artefacts Hallmarking Order 2021 across all notified districts.",
            ["IS 1417:2016 Gold and Gold Alloys", "Hallmarking Order 2021", "BIS AHC Regulations"]
        )

    # 8. Renewals & Form IX
    if any(k in q for k in ["renewal", "form ix", "expire", "countdown", "validity"]):
        return (
            "**BIS Licence Renewal Procedure (Form IX)**:\n\n"
            "1. **90-Day Advance Submission**: Applications for renewal of ISI/CRS licences must be filed at least 90 days before expiry on the Manakonline portal using Form IX.\n"
            "2. **Marking & Production Data**: Submit monthly production figures and marking fee calculations for the preceding licensing period.\n"
            "3. **In-house / Independent Test Reports**: Submit valid test certificates proving continuous conformity to the applicable Indian Standard.\n"
            "4. **Late Fees**: Submissions made less than 30 days before expiry incur late fees; unrenewed licences become expired and require a fresh application.",
            ["BIS (Conformity Assessment) Regulations 2018", "Form IX Renewal Guidelines"]
        )

    return (
        f"Regarding your query on '{query}':\n\n"
        "The Bureau of Indian Standards (BIS) operates product certification (ISI Mark), compulsory registration (CRS), foreign manufacturers certification (FMCS), and gold hallmarking (HUID). "
        "Domestic and foreign manufacturers must obtain the relevant licence or registration from the Manakonline portal prior to distribution. "
        "For specific standard clauses, testing fee schedules, or laboratory empanelment, please consult the BIS portal at https://bis.gov.in.",
        ["Bureau of Indian Standards Act 2016", "Manakonline Standard Directory"]
    )


def answer_question(question: str) -> dict:
    q = question.strip()
    # Check if query is a simple greeting or conversational phrase
    q_lower = q.lower()
    is_greeting = any(
        re.search(pat, q_lower)
        for pat in [
            r"^(hi|hello|hey|namaste|pranam|hola|greetings|good\s+morning|good\s+afternoon|good\s+evening)\b",
            r"^(who are you|what can you do|help me|thank you|thanks|bye|goodbye)\b"
        ]
    )

    if is_greeting:
        text, sources = _domain_fallback_answer(q)
        return {"answer": text, "sources": sources}

    chunks = retrieve(question)
    if chunks:
        context = "\n\n".join(f"[{c['source']}] {c['text']}" for c in chunks)
        prompt = f"Context:\n{context}\n\nQuestion: {question}\n\nAnswer with citations:"
    else:
        prompt = (
            f"Question: {question}\n\n"
            "Note: Answer authoritatively based on official BIS regulations, IS standards, schemes, and guidelines. "
            "Cite relevant standards (e.g., IS 16046, IS 1417) and provide practical steps."
        )

    provider_order = [config.LLM_PROVIDER]
    for p in ["openrouter", "groq", "xai", "gemini"]:
        if p not in provider_order:
            provider_order.append(p)

    for provider_name in provider_order:
        call_fn = _PROVIDERS.get(provider_name)
        if not call_fn:
            continue
        try:
            answer_text = call_fn(prompt)
            if answer_text and len(answer_text.strip()) > 10:
                sources = [c["source"] for c in chunks] if chunks else ["Bureau of Indian Standards Act 2016", "Manakonline Knowledge Base"]
                return {"answer": answer_text, "sources": sources}
        except Exception:
            continue

    # Fallback to local domain regulatory knowledge engine
    answer_text, fallback_sources = _domain_fallback_answer(question)
    sources = [c["source"] for c in chunks] if chunks else fallback_sources
    return {"answer": answer_text, "sources": sources}

