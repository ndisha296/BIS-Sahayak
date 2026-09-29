import os
import re
import json
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
import chromadb
from chromadb.utils import embedding_functions
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# =====================================================================
# 1. DATABASE CONNECTORS (CHROMADB & EXTRACTED SIT)
# =====================================================================

CHROMA_PATH = os.getenv("CHROMA_PERSIST_DIR", "./bis_vector_db")
SIT_PATH = "./sit_database.json" if os.path.exists("./sit_database.json") else ("./data/sit_database.json" if os.path.exists("./data/sit_database.json") else "sit_database.json")

chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
try:
    emb_fn = embedding_functions.DefaultEmbeddingFunction()
    vector_coll = chroma_client.get_or_create_collection(name="bis_standards_catalog", embedding_function=emb_fn)
except Exception:
    try:
        vector_coll = chroma_client.get_or_create_collection(name="bis_standards_catalog")
    except Exception:
        vector_coll = None

SIT_DB: Dict[str, List[str]] = {}
for possible_sit_path in [SIT_PATH, "./sit_database.json", "./data/sit_database.json", "data/sit_database.json"]:
    if os.path.exists(possible_sit_path):
        try:
            with open(possible_sit_path, "r", encoding="utf-8") as f:
                SIT_DB = json.load(f)
                break
        except Exception as e:
            print(f"[!] Warning reading SIT database: {e}")


def resolve_sit_apparatus(standard_number: str) -> List[str]:
    """Retrieves factory test machinery extracted from 1,850 product manuals."""
    if not SIT_DB:
        return []
    clean = re.sub(r'[\s\-_]+', ' ', standard_number.upper()).strip()
    if clean in SIT_DB:
        return SIT_DB[clean]
    std_prefix = clean.split(":")[0].strip()
    for k, v in SIT_DB.items():
        if k.split(":")[0].strip() == std_prefix:
            return v
    digits = re.findall(r'\d+', clean)
    if digits:
        for k, v in SIT_DB.items():
            if digits[0] in re.findall(r'\d+', k):
                return v
    return []


# =====================================================================
# 2. LOCAL RETRIEVAL LOGIC & OPENAI TOOL SCHEMA (FOR GROQ)
# =====================================================================

def search_bis_standards_and_testing_equipment(product_or_material: str) -> str:
    """
    Searches the official Bureau of Indian Standards (BIS) vector database and
    the 1,850 Product Manual SIT machinery tables for the given product, material, or system.
    """
    res = vector_coll.query(query_texts=[product_or_material], n_results=4)
    if not res["documents"] or not res["documents"][0]:
        return json.dumps({"status": "not_found", "message": "No standard found in database."})

    candidates = []
    for idx in range(len(res["documents"][0])):
        meta = res["metadatas"][0][idx]
        std_num = meta.get("standard_number", "")
        sit_items = resolve_sit_apparatus(std_num)
        candidates.append({
            "standard_number": std_num,
            "title": meta.get("clause_title", ""),
            "scheme": meta.get("scheme", "Scheme-I"),
            "pdf_source": meta.get("pdf_filename", "None"),
            "page": meta.get("pdf_page", 1),
            "bounding_box": [meta.get("x0", 0), meta.get("y0", 0), meta.get("x1", 0), meta.get("y1", 0)],
            "snippet": meta.get("text_snippet", "")[:350],
            "sit_mandatory_machinery": sit_items[:6]
        })

    return json.dumps({"status": "found", "matches": candidates})


TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_bis_standards_and_testing_equipment",
            "description": "Searches the official Bureau of Indian Standards (BIS) vector database and SIT machinery tables for the given product, material, or system.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_or_material": {
                        "type": "string",
                        "description": "The product, material, or appliance name to look up (always provide English product name for vector search)."
                    }
                },
                "required": ["product_or_material"]
            }
        }
    }
]

# =====================================================================
# 3. GROQ CLIENT & VERIFIED TOOL-CAPABLE MODEL DISCOVERY
# =====================================================================

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("\n[!] CRITICAL: GROQ_API_KEY missing in .env file or environment.")
    print("    Get your key from https://console.groq.com and add GROQ_API_KEY=gsk_... to your .env file.\n")

groq_client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=GROQ_API_KEY or "missing_key"
)

def get_best_available_groq_model() -> str:
    """Queries Groq API to select an active model that supports tool calling."""
    TOOL_CAPABLE_MODELS = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "llama-3.1-70b-versatile",
        "llama3-70b-8192",
        "llama3-8b-8192",
        "mixtral-8x7b-32768"
    ]
    try:
        models_data = groq_client.models.list()
        available_ids = {m.id for m in models_data.data}
        for model_id in TOOL_CAPABLE_MODELS:
            if model_id in available_ids:
                return model_id

        fallback = [mid for mid in available_ids if "whisper" not in mid and "embed" not in mid]
        if fallback:
            return fallback[0]
    except Exception as e:
        print(f"[!] Warning discovering Groq models: {e}")

    return "llama-3.1-8b-instant"

RESOLVED_MODEL_NAME = get_best_available_groq_model()
print(f"[*] Verified Groq model connected: {RESOLVED_MODEL_NAME}")


def transcribe_audio_payload(file_bytes: bytes, filename: str = "audio.mp3") -> str:
    """Transcribes audio using standard Groq Whisper across Indian languages without terms-acceptance errors."""
    AUDIO_MODELS = [
        "whisper-large-v3-turbo",
        "whisper-large-v3",
        "distil-whisper-large-v3-en"
    ]

    last_err = None
    for model_name in AUDIO_MODELS:
        try:
            # Explicitly provide filename and bytes tuple
            transcription = groq_client.audio.transcriptions.create(
                file=(filename, file_bytes),
                model=model_name,
                response_format="text",
                temperature=0.0
            )
            text_result = str(transcription).strip()
            if text_result:
                return text_result
        except Exception as e:
            last_err = e
            continue

    return f"[!] Transcription error: {str(last_err)}"

SYSTEM_INSTRUCTION = """You are the Official AI Compliance & Regulatory Intelligence Officer for Indian businesses, specializing in the Bureau of Indian Standards (BIS) and interrelated Indian statutory bodies.

MULTILINGUAL CAPABILITIES (INDIAN LANGUAGES):
- You fluently understand and respond in English, Hindi (हिन्दी), Hinglish, Marathi (मराठी), Gujarati (ગુજરાતી), Tamil (தமிழ்), Telugu (తెలుగు), Kannada (ಕನ್ನಡ), and Bengali (বাংলা).
- Always reply in the exact language/dialect the user writes or speaks in. If asked in Hindi, respond in clean Hindi; if asked in Hinglish, respond in natural conversational Hinglish.
- CRITICAL: Official standard designations, statutory acronyms, and technical terms MUST ALWAYS remain in English for legal accuracy (e.g., **IS 14543**, **IS 269**, **Scheme-I**, **ISI Mark**, **FSSAI FoSCoS**, **NABL Laboratory**, **TDS**).
- When invoking `search_bis_standards_and_testing_equipment`, always translate the product name into English within the tool argument (e.g., if user says "पानी की फैक्ट्री", query "packaged drinking water").

PRIMARY JURISDICTION & REGULATORY ACCURACY:
1. FOOD SERVICE & RESTAURANTS:
   - Restaurants, cafes, cloud kitchens, catering, bakeries, and dining establishments are legally mandated to be licensed by FSSAI (Food Safety and Standards Authority of India) under FoSCoS (Food Safety Compliance System), NOT by BIS.
   - If a user asks about opening/running a restaurant or cafe, clarify that this falls under FSSAI, explain the FSSAI license tiers (Basic, State, Central), and clarify that BIS does NOT license restaurant kitchens (BIS only applies to packaged bottled water or commercial pressure cookers/appliances).
2. PACKAGED DRINKING WATER:
   - Packaged Drinking Water (other than natural mineral water) is governed by IS 14543 under Scheme-I (Mandatory ISI Mark).
   - Natural Mineral Water is governed by IS 13428.
   - Note that packaged water requires BOTH a BIS ISI Mark (tested daily for microbiology/TDS) AND an FSSAI license.
3. PROHIBITED OR OUT-OF-SCOPE BUSINESSES:
   - Activities illegal under Indian law (e.g., strip clubs, adult entertainment, illegal gambling, narcotics) have no BIS standards. State clearly that adult entertainment and prostitution are illegal under Indian law (Bharatiya Nyaya Sanhita / Immoral Traffic Prevention Act) and are outside BIS purview.

STRICT CONVERSATIONAL DISCIPLINE:
- Focus solely on the active business topic. Every follow-up response must remain grounded in that specific industry and standard.
- Avoid general small talk or off-topic diversions.
- For physical manufactured goods, invoke `search_bis_standards_and_testing_equipment` to ground technical standards and SIT machinery checklists.
"""

# =====================================================================
# 4. SESSION STATE & CHAT HISTORIES
# =====================================================================

class SessionState(BaseModel):
    session_id: str
    active_business: Optional[str] = None
    pending_business: Optional[str] = None
    pending_prompt: Optional[str] = None

SESSION_STATES: Dict[str, SessionState] = {}
CONVERSATION_HISTORIES: Dict[str, List[Any]] = {}

def get_session_state(session_id: str) -> SessionState:
    if session_id not in SESSION_STATES:
        SESSION_STATES[session_id] = SessionState(session_id=session_id)
    return SESSION_STATES[session_id]

def reset_session(session_id: str) -> str:
    old_business = None
    if session_id in SESSION_STATES:
        old_business = SESSION_STATES[session_id].active_business
        del SESSION_STATES[session_id]
    if session_id in CONVERSATION_HISTORIES:
        del CONVERSATION_HISTORIES[session_id]

    if old_business:
        return f"Session reset. Closed topic '{old_business}'. You can now ask about a new business."
    return "Session cleared. What business or product would you like to discuss?"

def get_history(session_id: str) -> List[Any]:
    if session_id not in CONVERSATION_HISTORIES:
        CONVERSATION_HISTORIES[session_id] = [
            {"role": "system", "content": SYSTEM_INSTRUCTION}
        ]
    return CONVERSATION_HISTORIES[session_id]

# =====================================================================
# 5. ZERO-COST LOCAL INTENT CLASSIFICATION (PAN-INDIAN MULTILINGUAL)
# =====================================================================

FILLER_STARTERS = [
    # English
    "i want to start a ", "i wanna start a ", "i want to start ", "i wanna start ",
    "i want to open a ", "i wanna open a ", "i want to open ", "i wanna open ",
    "i want to make a ", "i wanna make a ", "i want to make ", "i wanna make ",
    "i want to sell ", "i wanna sell ", "i want to manufacture ", "i wanna manufacture ",
    "starting a ", "opening a ", "manufacturing ", "how to start ", "how to open ",
    # Hindi / Hinglish
    "mujhe shuru karna hai ", "mujhe start karna hai ", "shuru karna hai ",
    "factory lagani hai ", "factory lagana hai ", "business shuru karna hai ",
    "kholna chahta hu ", "shuru karna chahta hu ", "kholna hai ", "ka business ",
    "ki factory ", "kaise shuru kare ", "kaise start kare ",
    # Devanagari Hindi / Marathi
    "मुझे शुरू करना है ", "मुझे चालू करना है ", "सुरू करायचे आहे ", "सुरु करायचा आहे ",
    "कारखाना सुरू करायचा आहे ", "व्यवसाय सुरू करायचा आहे ", "तयार करायचे आहे ",
    # Gujarati
    "મારે શરૂ કરવું છે ", "બનાવવું છે ", "વેચવું છે ",
    # Bengali
    "আমি শুরু করতে চাই ", "ব্যবসা শুরু করতে চাই ", "তৈরি করতে চাই ",
    # Tamil / Telugu / Kannada
    "ஆரம்பிக்க வேண்டும் ", "தொடங்க வேண்டும் ", "ప్రారంభించాలనుకుంటున్నాను ", "ಮಾಡಲು ಬಯಸುತ್ತೇನೆ "
]

STOP_WORDS = {
    "i", "wanna", "want", "to", "start", "open", "make", "sell",
    "a", "an", "the", "company", "business", "factory", "plant", "unit",
    "mujhe", "karna", "hai", "kholna", "ka", "ki", "ke", "liye", "chahta", "hu",
    "shuru", "setup", "karaycha", "ahe", "suru", "chalu", "kaise", "kare"
}

def clean_business_name(raw_text: str) -> str:
    """Extracts clean product/venture nouns, stripping multilingual conversational wrappers."""
    cleaned = raw_text.lower().strip()
    for starter in FILLER_STARTERS:
        if cleaned.startswith(starter):
            cleaned = cleaned[len(starter):].strip()
            break
        if starter.strip() in cleaned:
            parts = cleaned.split(starter.strip())
            cleaned = parts[-1].strip() if parts[-1].strip() else parts[0].strip()
            break

    cleaned = re.sub(r'[\.\?!,।]+$', '', cleaned).strip()
    return cleaned.title() if cleaned else raw_text.title()

def analyze_intent(user_prompt: str, active_business: Optional[str]) -> Dict[str, Any]:
    p = user_prompt.lower().strip()
    words = re.findall(r'[\w]+', p, re.UNICODE)

    if not active_business:
        return {"intent": "FIRST_BUSINESS", "detected_business": clean_business_name(user_prompt)}

    # Multilingual Chit-Chat / Irrelevant Filter
    small_talk = [
        "who are you", "what is your name", "whats your name", "tell me a joke",
        "how are you", "what is the weather", "sing a song", "hello", "hi", "hey",
        "tum kaun ho", "aap kaun ho", "kya haal hai", "namaste", "kem cho", "vanakkam"
    ]
    if any(st in p for st in small_talk) and len(words) <= 5:
        return {"intent": "IRRELEVANT", "detected_business": None}

    # Detect new venture declaration across languages
    is_starter_present = any(starter.strip() in p for starter in FILLER_STARTERS)
    if is_starter_present:
        new_candidate = clean_business_name(p)
        active_keywords = {w for w in re.findall(r'[\w]+', active_business.lower(), re.UNICODE) if w not in STOP_WORDS}
        new_keywords = {w for w in re.findall(r'[\w]+', new_candidate.lower(), re.UNICODE) if w not in STOP_WORDS}

        if new_keywords and not (active_keywords & new_keywords):
            return {"intent": "NEW_BUSINESS", "detected_business": new_candidate}

    return {"intent": "FOLLOW_UP", "detected_business": None}

# =====================================================================
# 6. GROQ EXECUTION ENGINE (HARDENED FUNCTION CALLING + FALLBACK)
# =====================================================================

def execute_groq_turn(session_id: str, prompt: str) -> str:
    """Handles user query with function calling via Groq without schema crashes, with robust RAG fallback."""
    history = get_history(session_id)
    history.append({"role": "user", "content": prompt})

    try:
        response = None
        try:
            response = groq_client.chat.completions.create(
                model=RESOLVED_MODEL_NAME,
                messages=history,
                tools=TOOLS,
                tool_choice="auto",
                temperature=0.2
            )
        except Exception as e:
            if any(keyword in str(e).lower() for keyword in ["tool calling", "400", "not supported"]):
                response = groq_client.chat.completions.create(
                    model=RESOLVED_MODEL_NAME,
                    messages=history,
                    temperature=0.2
                )
            else:
                raise e

        msg = response.choices[0].message

        if msg.tool_calls:
            history.append(msg)

            for tool_call in msg.tool_calls:
                if tool_call.function.name == "search_bis_standards_and_testing_equipment":
                    try:
                        args = json.loads(tool_call.function.arguments)
                        query_arg = args.get("product_or_material", prompt)
                    except Exception:
                        query_arg = prompt

                    tool_result = search_bis_standards_and_testing_equipment(query_arg)
                    history.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": str(tool_result)
                    })

            final_res = groq_client.chat.completions.create(
                model=RESOLVED_MODEL_NAME,
                messages=history,
                temperature=0.2
            )
            final_text = final_res.choices[0].message.content or ""
            history.append({"role": "assistant", "content": final_text})
            return final_text

        content_text = msg.content or ""
        history.append({"role": "assistant", "content": content_text})
        return content_text
    except Exception as e:
        # Resilient fallback to BIS RAG & domain regulatory knowledge engine
        try:
            from app.rag import answer_question
            rag_res = answer_question(prompt)
            fallback_text = rag_res.get("answer", "")
            if fallback_text:
                history.append({"role": "assistant", "content": fallback_text})
                return fallback_text
        except Exception:
            pass
        return f"Regarding '{prompt}': Please verify standard details on the official BIS portal (https://bis.gov.in) or consult the Manakonline directory."

# =====================================================================
# 7. STATEFUL ORCHESTRATION PIPELINE
# =====================================================================

def handle_user_message(user_input: str, session_id: str) -> Dict[str, Any]:
    session = get_session_state(session_id)
    text_clean = user_input.strip()
    lower_input = text_clean.lower()

    # 1. PENDING TOPIC SWITCH RESOLUTION (Multilingual Affirmation)
    if session.pending_business:
        affirmative_words = ["yes", "switch", "sure", "proceed", "end session", "start new", "ok", "okay", "haan", "ha", "hoo", "am"]
        negative_words = ["no", "cancel", "stay", "keep", "continue", "nahi", "na", "nako", "vendam", "vaddu"]

        if any(w in lower_input for w in affirmative_words):
            new_biz = session.pending_business
            saved_prompt = session.pending_prompt or text_clean

            session.active_business = new_biz
            session.pending_business = None
            session.pending_prompt = None

            CONVERSATION_HISTORIES[session_id] = [
                {"role": "system", "content": SYSTEM_INSTRUCTION}
            ]

            answer = execute_groq_turn(
                session_id,
                f"I am now starting a new session specifically for: '{new_biz}'. Query: {saved_prompt}"
            )
            return {
                "answer": f"**Previous session ended.** Starting discussion for **{new_biz}**.\n\n" + answer,
                "active_business": session.active_business,
                "needs_confirmation": False
            }
        elif any(w in lower_input for w in negative_words):
            active = session.active_business
            session.pending_business = None
            session.pending_prompt = None
            return {
                "answer": f"Understood. We will keep discussing **{active}**. What else would you like to know regarding its compliance, testing, or licenses?",
                "active_business": active,
                "needs_confirmation": False
            }
        else:
            return {
                "answer": (
                    f"⚠️ Please confirm: Would you like to end your discussion about **{session.active_business}** "
                    f"and switch to **{session.pending_business}**?\n\n"
                    f"• Type **'Yes'** (हाँ) to switch to the new business.\n"
                    f"• Type **'No'** (नहीं) to stay with {session.active_business}."
                ),
                "active_business": session.active_business,
                "needs_confirmation": True
            }

    # 2. INTENT CLASSIFICATION
    classification = analyze_intent(text_clean, session.active_business)
    intent = classification.get("intent", "FOLLOW_UP")
    detected_biz = classification.get("detected_business")

    # CASE A: IRRELEVANT / OFF-TOPIC QUESTION
    if intent == "IRRELEVANT":
        if session.active_business:
            return {
                "answer": (
                    f"I can only assist with regulatory compliance, BIS Indian Standards, and mandatory licensing for **{session.active_business}**.\n\n"
                    f"Please re-ask a question relevant to **{session.active_business}** (e.g., required factory machinery, application steps, testing fees, or renewal timelines)."
                ),
                "active_business": session.active_business,
                "needs_confirmation": False
            }
        else:
            return {
                "answer": (
                    "I am the Official Regulatory & BIS Compliance Assistant for Indian businesses.\n\n"
                    "Please state the specific product, manufactured good, or business you want to start or certify (e.g., 'packaged drinking water', 'restaurant', 'cement', 'LED lights')."
                ),
                "active_business": None,
                "needs_confirmation": False
            }

    # CASE B: NEW BUSINESS INQUIRY WHILE A SESSION IS ACTIVE
    if intent == "NEW_BUSINESS" and session.active_business:
        new_candidate = detected_biz or clean_business_name(text_clean)
        session.pending_business = new_candidate
        session.pending_prompt = text_clean

        return {
            "answer": (
                f"⚠️ **Topic Switch Detected:**\n"
                f"You are currently in a session discussing **{session.active_business}**.\n\n"
                f"Each session focuses on one business idea at a time. Do you want to end your current session and start discussing **{new_candidate}**?\n\n"
                f"• Reply **'Yes'** to switch to {new_candidate}.\n"
                f"• Reply **'No'** to keep discussing {session.active_business}.\n"
                f"*(Or type **'reset'** anytime to clear the session)*"
            ),
            "active_business": session.active_business,
            "needs_confirmation": True
        }

    # CASE C: FIRST BUSINESS DECLARATION
    if intent == "FIRST_BUSINESS" or (not session.active_business and detected_biz):
        session.active_business = detected_biz or clean_business_name(text_clean)
        answer = execute_groq_turn(session_id, text_clean)
        return {
            "answer": answer,
            "active_business": session.active_business,
            "needs_confirmation": False
        }

    # CASE D: RELEVANT FOLLOW-UP QUESTION
    answer = execute_groq_turn(session_id, text_clean)
    return {
        "answer": answer,
        "active_business": session.active_business,
        "needs_confirmation": False
    }

# =====================================================================
# 8. FASTAPI REST SERVER (REACT / NEXT.JS FRONTEND INTEGRATION)
# =====================================================================

try:
    from fastapi import FastAPI, UploadFile, File, Form
    from fastapi.middleware.cors import CORSMiddleware

    app = FastAPI(title="BIS & Statutory Compliance Engine (Multilingual & Voice)", version="5.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    class UserChatRequest(BaseModel):
        session_id: str
        message: str

    class ResetChatRequest(BaseModel):
        session_id: str

    @app.get("/")
    async def root():
        return {
            "status": "online",
            "model": RESOLVED_MODEL_NAME,
            "voice_support": "whisper-large-v3-turbo",
            "languages": ["English", "Hindi", "Marathi", "Gujarati", "Tamil", "Telugu", "Kannada", "Bengali"],
            "docs": "/docs"
        }

    @app.post("/api/chat")
    async def chat_endpoint(req: UserChatRequest):
        try:
            res = handle_user_message(req.message, req.session_id)
            return {
                "session_id": req.session_id,
                "answer": res["answer"],
                "active_business": res.get("active_business"),
                "needs_confirmation": res.get("needs_confirmation", False)
            }
        except Exception as e:
            return {
                "session_id": req.session_id,
                "answer": f"Inference Notice: {str(e)}",
                "active_business": None,
                "needs_confirmation": False
            }

    @app.post("/api/voice-chat")
    async def voice_chat_endpoint(session_id: str = Form(...), file: UploadFile = File(...)):
        """Direct Voice Endpoint: Transcribes spoken speech and generates compliant answers."""
        try:
            audio_bytes = await file.read()
            transcription = transcribe_audio_payload(audio_bytes, filename=file.filename or "recording.webm")

            if transcription.startswith("[!]"):
                return {
                    "session_id": session_id,
                    "transcription": transcription,
                    "answer": "Could not process audio. Please ensure clear speech and try again.",
                    "active_business": None,
                    "needs_confirmation": False
                }

            res = handle_user_message(transcription, session_id)
            return {
                "session_id": session_id,
                "transcription": transcription,
                "answer": res["answer"],
                "active_business": res.get("active_business"),
                "needs_confirmation": res.get("needs_confirmation", False)
            }
        except Exception as e:
            return {
                "session_id": session_id,
                "transcription": "",
                "answer": f"Voice Endpoint Error: {str(e)}",
                "active_business": None,
                "needs_confirmation": False
            }

    @app.post("/api/reset-session")
    async def reset_endpoint(req: ResetChatRequest):
        msg = reset_session(req.session_id)
        return {"status": "success", "message": msg}

except ImportError:
    app = None

# =====================================================================
# 9. PRODUCTION & LOCAL EXECUTION RUNNER
# =====================================================================

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    # If running on Railway/cloud container, boot FastAPI directly
    if os.environ.get("RAILWAY_ENVIRONMENT") or os.environ.get("PORT"):
        print(f"[*] Cloud environment detected. Starting FastAPI on port {port}...")
        uvicorn.run(app, host="0.0.0.0", port=port)
    else:
        print("\n" + "=" * 75)
        print("BIS & REGULATORY COMPLIANCE AI ENGINE")
        print(f"Active Groq Model: {RESOLVED_MODEL_NAME} | Multilingual & Voice Active")
        print("=" * 75)
        print("• Type 'api' to launch FastAPI server.")
        print("• Type 'reset' to clear session.")
        print("• Type 'exit' to quit.\n")

        cli_session_id = "terminal_user"
        while True:
            try:
                user_input = input("\nYou: ").strip()
                if not user_input:
                    continue
                if user_input.lower() == "exit":
                    break
                if user_input.lower() in ["reset", "new"]:
                    print(f"\nSystem: {reset_session(cli_session_id)}")
                    continue
                if user_input.lower() == "api":
                    print(f"\n[*] Starting FastAPI Server on http://0.0.0.0:{port} ...")
                    uvicorn.run(app, host="0.0.0.0", port=port)
                    break

                output = handle_user_message(user_input, session_id=cli_session_id)
                print(f"\nAI:\n{output['answer']}")
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"\n[!] Error: {e}")