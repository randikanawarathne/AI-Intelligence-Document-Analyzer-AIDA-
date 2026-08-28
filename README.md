# AIDA — AI Intelligence Document Analyzer (v2.0)

> **Next-Generation Local & Cloud Intelligence Analysis Platform**
> 100% Private, Local LLM Intelligence powered by **Ollama** (`llama3.2`, `mistral`, `deepseek-r1`, `nomic-embed-text`), FastAPI hybrid vector search, Cloud Firestore persistence, Firebase Authentication, and interactive 60fps relational knowledge maps.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)
![Ollama](https://img.shields.io/badge/Local%20LLM-Ollama%20(Llama%203.2)-f97316.svg)
![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.12%20%7C%203.14-059669.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)
![HTML5 / CSS3](https://img.shields.io/badge/Frontend-Vanilla%20HTML%2FCSS%2FJS-4f46e5.svg)
![Firebase](https://img.shields.io/badge/Cloud%20DB-Firebase%20Firestore-f59e0b.svg)
![Theme](https://img.shields.io/badge/Design-Executive%20Light%20%26%20Dark-2563eb.svg)

---

## 🦙 100% Local Intelligence with Ollama

AIDA defaults to running **completely locally and privately** using **Ollama**, eliminating the need for paid cloud API keys:

### 1. Install & Launch Ollama
Download Ollama from [ollama.com](https://ollama.com) and start your preferred model:
```bash
# Pull and run the reasoning model
ollama run llama3.2

# (Optional) Pull the dense embedding model
ollama pull nomic-embed-text
```

### 2. Configure Environment (`.env`)
```env
LLM_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2
OLLAMA_EMBED_MODEL=nomic-embed-text
```

---

## 🌟 Key Capabilities

1. **Local & Cloud Intelligence (Ollama / Fallback / Cloud)**:
   - Zero-cost local intelligence via **Ollama** (`llama3.2`, `mistral`, `deepseek-r1`, `qwen2.5`).
   - Dense local embeddings via `nomic-embed-text` or built-in TF-IDF / Cosine Vector Space.
   - Optional fallbacks to OpenAI / Google Gemini if configured.

2. **Authentication & Security Clearances**:
   - Integrated **Firebase Authentication** with security classification badges (`TOP SECRET // NOFORN`).
   - One-click **"⚡ Instant Demo Access (Lead Intelligence Analyst)"** bypass for rapid review.
   - User profile dropdown, avatar initials, and sign-out controls.

3. **Cloud Database (Firebase Firestore)**:
   - Synchronize uploaded document metadata, chunks, chat history, and generated intelligence dossiers to **Google Cloud Firestore**.
   - Built-in LocalStorage fallback for 100% offline, zero-configuration operation.
   - Custom Firebase config JSON editor in Settings.

4. **Pristine Executive Light Theme & Modern Typography**:
   - Executive light aesthetic (clean porcelain `#f8fafc`, pristine white cards, deep slate text `#0f172a`, cyber emerald accents `#059669`).
   - Professional typography stack: **Plus Jakarta Sans** (headings), **Inter** (UI), **JetBrains Mono** (telemetry & citations).
   - Instant ☀️ Light / 🌙 Dark Theme toggle in topbar and settings.

5. **Optimized Mobile UX**:
   - Responsive layout with mobile header and slide-over navigation drawer.
   - Touch-optimized tactical playbooks (`🎯 Threat Profiling`, `💰 Financial Forensics`, `⏱ Timeline Reconstruction`).
   - Mobile-optimized collapsible Citation Inspector drawer.

6. **Multi-Source Document Ingestion**:
   - Ingest `.pdf`, `.docx`, `.txt`, `.csv`, `.json`, and `.md`.
   - Automated token-aware sliding window chunker (450 tokens, 50 overlap).
   - Regex-based Named Entity Recognition (NER) for APT threat actors, CVEs, IPs, crypto/wire transactions, and jurisdictions.

7. **Relational Knowledge Map**:
   - 60fps HTML5 Canvas physics simulation with Coulomb repulsion and Hooke springs.
   - Particle pulses along active connections, entity filtering chips, drag, zoom, and cross-reference pivoting.

8. **Intelligence Dossier Generator**:
   - Multi-format briefing exporter: **Printable PDF**, **Markdown (.md)**, **Standalone HTML Report**, and **JSON Dataset**.

---

## 🚀 Quick Start (Local)

### 1. Windows 1-Click Launch
Double-click `start.bat` or run:
```powershell
.\start.ps1
```

### 2. Manual Command Line
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Start the unified FastAPI + Static Web server
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser.

---

## ☁️ Deploy to Vercel (1-Click)

The repository includes pre-configured `vercel.json` and `api/index.py` serverless functions.

1. Push this repository to **GitHub**:
   ```bash
   git add .
   git commit -m "feat: AIDA with Ollama local integration and Vercel support"
   git push origin main
   ```
2. Go to [vercel.com/new](https://vercel.com/new) and import your repository.
3. Click **Deploy**!

---

## 🧪 Testing

Run the automated endpoint test suite:
```bash
python test_backend.py
```

---

## 📄 License
MIT License. Open source and free to use.
