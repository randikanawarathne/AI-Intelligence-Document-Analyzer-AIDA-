# AIDA — Environment Variables & Vercel Deployment Guide

Comprehensive reference for environment configuration and 1-click Vercel cloud deployment.

---

## ⚙️ Environment Variables Reference

All environment variables are optional. When omitted, **AIDA** automatically defaults to **Zero-API-Key offline operation**.

| Variable | Type | Default | Description |
|---|---|---|---|
| `LLM_PROVIDER` | `string` | `ollama` | Active AI provider (`ollama`, `auto`, `openai`, `gemini`, `fallback`). |
| `OLLAMA_HOST` | `string` | `http://localhost:11434` | Host address of local Ollama instance (Local development only). |
| `OLLAMA_MODEL` | `string` | `llama3.2` | Primary Ollama text reasoning model (`llama3.2`, `mistral`, `deepseek-r1`). |
| `OLLAMA_EMBED_MODEL` | `string` | `nomic-embed-text` | Ollama model used for dense vector embeddings. |
| `OPENAI_API_KEY` | `string` | `""` | *(Optional)* OpenAI key if using GPT-4o / text-embedding-3-small. |
| `OPENAI_MODEL` | `string` | `gpt-4o-mini` | *(Optional)* OpenAI model name. |
| `GEMINI_API_KEY` | `string` | `""` | *(Optional)* Google Gemini key if using Gemini 2.0 / 1.5 Flash. |
| `GEMINI_MODEL` | `string` | `gemini-1.5-flash` | *(Optional)* Google Gemini model name. |
| `CHUNK_SIZE` | `integer` | `450` | Number of tokens per chunk sliding window. |
| `CHUNK_OVERLAP` | `integer` | `50` | Token overlap between consecutive chunks. |
| `TOP_K` | `integer` | `5` | Default number of semantic citations retrieved per query. |

---

## 📋 Environment Profiles

### Profile A: 100% Local / Zero-Cost (Ollama Default)
Create a `.env` file in the root directory:
```env
LLM_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2
OLLAMA_EMBED_MODEL=nomic-embed-text
```

### Profile B: Vercel Cloud Serverless (Zero API Keys / Built-in Hybrid Search)
No environment variables required! The serverless Python function uses built-in **TF-IDF + Cosine Space Vector Search** and regex Named Entity Recognition.

### Profile C: Vercel Cloud with Optional Cloud LLM (OpenAI / Gemini)
In your Vercel Project Settings (`Settings` → `Environment Variables`):
```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-proj-your-openai-key-here
OPENAI_MODEL=gpt-4o-mini
```
*(Or set `GEMINI_API_KEY=AIzaSy...` for Google Gemini)*

---

## ☁️ Step-by-Step Vercel Deployment Guide

### Step 1: Push Your Code to GitHub
Open your terminal in the project directory:
```bash
git add .
git commit -m "feat: configure AIDA v2.0 for Vercel deployment"
git push origin main
```

### Step 2: Import into Vercel
1. Go to **[vercel.com/new](https://vercel.com/new)** and sign in with your GitHub account.
2. Under **Import Git Repository**, find `AI-Intelligence-Document-Analyzer-AIDA-` and click **Import**.

### Step 3: Configure Project Settings
- **Project Name**: `aida-document-analyzer` (or leave default)
- **Framework Preset**: `Other` *(Vercel automatically detects `vercel.json`)*
- **Root Directory**: `./` *(Leave default)*
- **Build and Output Settings**: Defaults managed automatically by `vercel.json`

### Step 4: Add Environment Variables (Optional)
If you want to enable cloud LLMs on Vercel:
- Click **Environment Variables**
- Key: `OPENAI_API_KEY` (or `GEMINI_API_KEY`) → Value: *your API key*
- Click **Add**

### Step 5: Deploy
Click **Deploy**!
Vercel will build:
- `@vercel/static`: Global CDN distribution of the pure HTML5/CSS/JS frontend in `web/`
- `@vercel/python`: Serverless FastAPI endpoint at `api/index.py`

Once complete, your production URL will be live at:
```
https://aida-document-analyzer.vercel.app
```

---

## 🏗️ How Routing Works on Vercel (`vercel.json`)

```json
{
  "version": 2,
  "builds": [
    { "src": "api/index.py", "use": "@vercel/python" },
    { "src": "web/**", "use": "@vercel/static" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "api/index.py" },
    { "src": "/health", "dest": "api/index.py" },
    { "src": "/upload", "dest": "api/index.py" },
    { "src": "/query", "dest": "api/index.py" },
    { "src": "/documents", "dest": "api/index.py" },
    { "src": "/documents/(.*)", "dest": "api/index.py" },
    { "src": "/intel/(.*)", "dest": "api/index.py" },
    { "src": "/stats", "dest": "api/index.py" },
    { "src": "/export/(.*)", "dest": "api/index.py" },
    { "src": "/css/(.*)", "dest": "/web/css/$1" },
    { "src": "/js/(.*)", "dest": "/web/js/$1" },
    { "src": "/(.*)", "dest": "/web/$1" }
  ]
}
```

---

## ⚡ Serverless Persistence Note
On Vercel, serverless compute functions are ephemeral (stateless).
- **Client-Side Persistence**: In-browser document indexing and LocalStorage cache your documents, queries, and dossiers locally.
- **Cloud Firestore**: When configured in **Settings** or `.env`, documents and chat histories automatically sync to **Firebase Cloud Firestore** for persistent multi-device access across serverless invocations.
