# BIS Sahayak (बी.आई.एस. सहायक) 🛡️🇮🇳
### Intelligent AI Compliance Co-Pilot & Hallmark Verification Portal for the Bureau of Indian Standards

[![Python](https://img.shields.io/badge/Python-3.11%2B-blue.svg?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-1.0.0-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6.1-646CFF.svg?logo=vite)](https://vitejs.dev)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?logo=docker)](https://www.docker.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📌 Overview

**BIS Sahayak** is a full-stack, AI-powered compliance co-pilot and regulatory assistance portal built for Indian manufacturers, MSMEs, startups, and consumers navigating the **Bureau of Indian Standards (BIS)** ecosystem.

Navigating Indian technical standards (**IS numbers**), mandatory Quality Control Orders (**QCOs**), product certification schemes (**ISI Mark Scheme I**, **CRS Scheme II**, **FMCS**), Gold **HUID Hallmarking**, testing lab directories (**OSL**), and license renewals (**Form IX**) can be complex and fragmented. 

**BIS Sahayak** unifies these workflows into a modern, bilingual (English & Hindi) platform combining Retrieval-Augmented Generation (RAG), Computer Vision (OCR & Object Detection), automated compliance cost calculation, quotation generation, and real-time license lifecycle tracking.

---

## 🌟 Key Features

### 1. 🤖 Multilingual AI Regulatory Assistant (RAG Pipeline)
- **Bilingual Conversations**: Seamlessly interact in English, Hindi (हिन्दी), or Hinglish.
- **RAG Architecture**: Retrieves authoritative context from ingested Indian Standards (IS texts), BIS Act 2016 guidelines, and Manakonline gazettes.
- **Strict Regulatory Citations**: Every response cites exact standards (e.g., `[Source: IS 16046]`, `[Source: Form IX Guidelines]`).
- **Resilient Multi-Provider Cascade**: Automatically routes queries through configured LLMs with automated fallback to an embedded domain regulatory engine.

### 2. 🔍 Product-to-Standard & OSL Lab Discovery
- **Smart Standard Matcher**: Maps raw product keywords (e.g., *"lithium-ion battery"*, *"cement"*, *"packaged drinking water"*) to official **IS Standards** and applicable schemes (ISI vs. CRS vs. Hallmarking).
- **Testing Facilities Directory**: Search BIS-recognized **Off-Site Laboratories (OSL)**, approved testing scopes, validity dates, and official fee schedules.

### 3. 💰 Cost & Quotation Engine with MSME Concessions
- **Dynamic Fee Breakdown**: Calculates application fees, factory audit charges, lab test fees, and annual marking fees.
- **MSME 50% Subsidy Support**: Automatically computes government concessions for Udyam-registered startups and MSMEs.
- **Instant Quotation Generation**: Generates persistent quote references (`BIS-QTE-XXXXX`) for enterprise compliance budgeting.

### 4. 💎 Gold Hallmark & 6-Digit HUID Verification
- **Dual-Mode Verification**: Verify laser-engraved 6-character alphanumeric **HUID** codes either via typed input or direct photo upload.
- **Computer Vision OCR**: Uses **EasyOCR** and optional **YOLOv8** bounding-box localization to detect and parse micro-engravings on rings, bangles, and chains.
- **Purity & Registry Cross-Check**: Validates 24K (999), 22K (916), 18K (750), and 14K (585) claimed purities against the registry.

### 5. 📊 MSME & Startup Compliance Dashboard
- **License Lifecycle Tracking**: Track active ISI licenses, CRS registrations, and Hallmark certifications.
- **3-Tier Expiry Reminder Engine**: Visual countdown alerts at **90 Days**, **60 Days**, and **30 Days (Urgent)** with guided Form IX renewal checklists.
- **Dual Storage & Cloud Sync**: Local SQLite database paired with automated cloud sync to Supabase PostgreSQL.

---

## 🧠 AI & Machine Learning Models Used

| Model / Framework | Purpose / Domain | Deployment Mode |
| :--- | :--- | :--- |
| **Llama 3.3 (70B Versatile)** | Primary High-Intelligence LLM for RAG QA & bilingual reasoning via Groq | Cloud API (Groq) |
| **Llama 3.1 (8B Instruct)** | Lightweight, cost-efficient LLM fallback via OpenRouter | Cloud API (OpenRouter) |
| **Grok 2 / Gemini 2.0 Flash** | Alternative high-speed multimodal reasoning engines | Cloud API (xAI / Google) |
| **Sentence-Transformers (`all-MiniLM-L6-v2`)** | 384-dimensional dense vector embeddings for IS standards retrieval | Local (CPU / CUDA) |
| **ChromaDB** | Embedded Vector Store for semantic chunk retrieval | Local Persistence |
| **EasyOCR / PaddleOCR** | Optical Character Recognition for micro-engraved 6-digit HUIDs | Local (CPU / CUDA GPU) |
| **YOLOv8n (`ultralytics`)** | Custom trained object detector to crop hallmark regions on jewellery | Local (`best.pt` weights) |
| **Local Domain Fallback Engine** | Deterministic, citation-rich expert knowledge engine when offline | Local Python Runtime |

---

## 🏗️ System Architecture

```
                                  +---------------------------------------+
                                  |    React 19 + Vite Frontend (UI)      |
                                  | (Dashboard, HUID OCR, Chat, Schemes)  |
                                  +-------------------+-------------------+
                                                      |  HTTP / REST
                                                      v
+-------------------------------------------------------------------------------------------------+
|                                    FastAPI Backend (Port 8000)                                  |
|                                                                                                 |
|   +-------------------+   +--------------------+   +--------------------+   +---------------+   |
|   |  Auth & Profile   |   |   Standards & OSL  |   |  Cost / Quotation  |   | HUID Hallmark |   |
|   |   (JWT + MSME)    |   |     Directory      |   |     Calculator     |   | OCR Pipeline  |   |
|   +---------+---------+   +---------+----------+   +---------+----------+   +-------+-------+   |
|             |                       |                        |                      |           |
|             v                       v                        v                      v           |
|   +-----------------------------------------------------------------------------+   | EasyOCR   |
|   |                   Database Layer (SQLite / Supabase Postgres)               |   | YOLOv8    |
|   +-----------------------------------------------------------------------------+   +-----------+
|                                                      |                                          |
|   +--------------------------------------------------+--------------------------------------+   |
|   |                       RAG Regulatory Knowledge Engine (rag.py)                          |   |
|   |                                                                                         |   |
|   |   +------------------------+      +---------------------+      +--------------------+   |   |
|   |   | Sentence-Transformers  | ---> | Chroma Vector Store | ---> | Groq / OpenRouter  |   |   |
|   |   |   (all-MiniLM-L6-v2)   |      |  (IS Standards DB)  |      |   xAI / Gemini LLM |   |   |
|   |   +------------------------+      +---------------------+      +--------------------+   |   |
+---|-----------------------------------------------------------------------------------------|---+
```

---

## 💻 Tech Stack

- **Backend**: Python 3.11+, FastAPI, SQLAlchemy, Pydantic v2, Uvicorn, PyJWT.
- **Frontend**: React 19, Vite, Tailwind-compatible modern CSS, Lucide Icons, Axios, i18next, Canvas Confetti.
- **Database**: SQLite (local) + Supabase (PostgreSQL Cloud Sync).
- **AI / Embeddings**: ChromaDB, Sentence-Transformers, Groq SDK / REST APIs, xAI Grok, Google Gemini.
- **Vision / OCR**: PyTorch, Torchvision, OpenCV, EasyOCR, Ultralytics YOLOv8.
- **DevOps**: Docker, Multi-stage Dockerfile, Docker Compose, Nginx.

---

## 🚀 Getting Started (Local Setup)

### Prerequisites
- **Python 3.10+** (Python 3.11 or 3.12 recommended)
- **Node.js 18+** & `npm`
- **Git**

### Step 1: Clone the Repository
```bash
git clone https://github.com/ndisha296/BIS-Sahayak.git
cd BIS-Sahayak
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` and set your preferred LLM provider and API key:
```env
# Choose provider: groq | openrouter | gemini | xai
LLM_PROVIDER=groq

# API Keys (at least one is required for live LLM responses)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free

GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash

# Auth & Database
JWT_SECRET=your-secure-random-secret-key
DATABASE_URL=sqlite:///./bis_assistant.db
CHROMA_PERSIST_DIR=./chroma_store
```

---

### Step 3: Set Up and Start Backend Server

```bash
# 1. Create and activate virtual environment
python -m venv venv

# Windows (PowerShell / Command Prompt)
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. (Optional) Seed demo standards, labs, and mock HUIDs
python seed_data.py

# 4. Launch FastAPI server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- Interactive API Docs (Swagger UI): **http://127.0.0.1:8000/docs**
- Health Check: **http://127.0.0.1:8000/health**

---

### Step 4: Set Up and Start Frontend Portal

In a new terminal window:
```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
- Open your browser at: **http://localhost:5173**

---

## 🐳 Docker & Docker Compose Deployment

BIS Sahayak is fully containerized for one-command deployment of both backend and frontend services.

### Run with Docker Compose
```bash
# Build and launch both Backend (port 8000) and Frontend (port 5173 / 80)
docker compose up --build -d
```

### View Logs
```bash
# Check combined logs
docker compose logs -f

# Check backend logs only
docker compose logs -f backend
```

### Seed Data in Container
```bash
docker compose exec backend python seed_data.py
```

### Stop Containers
```bash
docker compose down
```

---

## 📖 API Reference & Endpoints

### 🔐 Authentication & Profile
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user account | No |
| `POST` | `/api/auth/token` | OAuth2 Password login returning JWT bearer token | No |
| `GET` | `/api/profile/me` | Get currently signed-in user and business profile | Yes (`Bearer Token`) |
| `PUT` | `/api/business/profile` | Create or update MSME business information | Yes (`Bearer Token`) |

### 💬 AI Assistant & Standards Matching
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/chat` | Send question to bilingual RAG assistant | No |
| `POST` | `/api/recommend-standard` | Match product name to applicable IS standard | No |
| `GET` | `/api/testing-facilities` | Search labs by Indian Standard code (`?standard=IS...`) | No |

### 💰 Cost Calculator & Quotations
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/cost-calculator` | Calculate itemized compliance fees + MSME concession | No |
| `POST` | `/api/quotations` | Save quotation request and generate quote reference | No |
| `GET` | `/api/quotations` | List submitted quotation requests | No |

### 💎 Hallmark & HUID Verification
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/verify-hallmark` | Upload jewellery image for EasyOCR/YOLO HUID scan | No |
| `POST` | `/api/verify-hallmark/code` | Manually verify 6-character HUID & check purity match | No |

### 📜 Certifications & Renewal Engine
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/certifications` | Add a license with issue & expiry dates | Yes (`Bearer Token`) |
| `GET` | `/api/certifications` | List user licenses with 90/60/30-day countdowns | Yes (`Bearer Token`) |

---

## 🏋️‍♂️ Optional: Training Custom YOLOv8 Hallmark Detector

If you want to enable automatic jewellery hallmark localization before OCR:

1. Collect & label 100-200 jewellery images with hallmark bounding boxes on [Roboflow](https://roboflow.com).
2. Export dataset in **YOLOv8** format into `hallmark_dataset/`.
3. Run training:
   ```bash
   python train_yolo.py
   ```
4. Copy the trained weights `runs/hallmark_detector/weights/best.pt` to the project root:
   ```bash
   cp runs/hallmark_detector/weights/best.pt ./best.pt
   ```
5. `ocr_service.py` automatically detects `best.pt` and crops hallmark regions dynamically before running EasyOCR!

---

## 🗄️ Ingesting Official BIS Standards & Excel Files

To ingest new PDF standards or official Excel lab directories:
```bash
python -m app.ingest_standards --data-dir path/to/standards_folder
```

---

## 🤝 Contributing

Contributions are welcome! Follow these steps:
1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/NewFeature`).
3. Commit your changes (`git commit -m "Add NewFeature"`).
4. Push to the branch (`git push origin feature/NewFeature`).
5. Open a Pull Request.

---

## 📄 License

This project is open-source under the **MIT License**.

---

*Made with ❤️ for Indian MSMEs, Innovators, and Consumers by the BIS Sahayak Team.*
