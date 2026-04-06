# AIDA — AI Intelligence Document Analyzer

> A production-grade RAG (Retrieval-Augmented Generation) system for intelligence analysis.  
> Upload documents → semantic search via FAISS → LLM-generated answers.

![Stack](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi)
![Stack](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Stack](https://img.shields.io/badge/FAISS-1.8-blue?style=flat-square)
![Stack](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?style=flat-square&logo=openai)

---

## Architecture

```
User → React Frontend (port 3000)
         │
         ▼
  FastAPI Backend (port 8000)
         │
    ┌────┴──────────────────┐
    │                       │
    ▼                       ▼
Text Chunking          POST /query
+ tiktoken                  │
    │                  Embed query
    ▼                  FAISS search
OpenAI Embeddings      Top-K chunks
(ada-002)                   │
    │                       ▼
    ▼              GPT-4o-mini answer
FAISS IndexFlatIP           │
(cosine similarity)         ▼
                       JSON response
                     { answer, citations }
```

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- OpenAI API key (`OPENAI_API_KEY`)

### Option A — Local (recommended for development)

**1. Backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Set your OpenAI key
export OPENAI_API_KEY=sk-your-key-here

uvicorn main:app --reload
# → http://localhost:8000
# → http://localhost:8000/docs  (Swagger UI)
```

**2. Frontend**

```bash
cd frontend
npm install
npm start
# → http://localhost:3000
```

### Option B — Docker Compose (one command)

```bash
# Create .env file
echo "OPENAI_API_KEY=sk-your-key-here" > .env

docker compose up --build
# Backend  → http://localhost:8000
# Frontend → http://localhost:3000
```

---

## API Reference

### `GET /health`
Returns system status, vector count, and document count.

```json
{
  "status": "ok",
  "vectors": 1248,
  "documents": 3,
  "chunks": 1560
}
```

### `POST /upload`
Upload a document for ingestion.

```bash
curl -X POST http://localhost:8000/upload \
  -F "file=@report.pdf"
```

```json
{
  "message": "Document processed successfully",
  "chunks": 847,
  "elapsed_s": 3.2
}
```

### `POST /query`
Query the knowledge base.

```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What financial anomalies were detected?"}'
```

```json
{
  "answer": "Based on the documents...",
  "citations": [
    {
      "chunk_id": 42,
      "score": 0.94,
      "source": "report.pdf",
      "text": "Relevant extracted passage..."
    }
  ]
}
```

### `GET /documents`
List all ingested documents.

### `GET /stats`
Get detailed system statistics.

---

## Project Structure

```
aida/
├── backend/
│   ├── main.py              # FastAPI app — all endpoints
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── App.js           # Router + system health check
│   │   ├── index.css        # Design tokens (CSS variables)
│   │   ├── components/
│   │   │   ├── Sidebar.js   # Navigation sidebar
│   │   │   ├── Topbar.js    # Top navigation bar
│   │   │   └── NetworkGraph.js  # Animated canvas knowledge map
│   │   ├── pages/
│   │   │   ├── DashboardPage.js   # Overview + quick actions
│   │   │   ├── IntelPage.js       # Bento grid intel dashboard
│   │   │   ├── SystemsPage.js     # Health monitoring + live logs
│   │   │   ├── WorkspacePage.js   # RAG chat interface
│   │   │   └── KnowledgePage.js   # Document upload + management
│   │   └── utils/
│   │       └── api.js        # Axios API client
│   ├── public/index.html
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
│
├── docker-compose.yml
└── README.md
```

---

## Features

| Feature | Details |
|---|---|
| **Document Ingestion** | PDF, DOCX, TXT — chunked with tiktoken (500 tok / 50 overlap) |
| **Embeddings** | OpenAI `text-embedding-ada-002` (1536-dim) |
| **Vector Search** | FAISS `IndexFlatIP` with L2-normalised vectors (cosine similarity) |
| **Generation** | GPT-4o-mini with retrieved context + system prompt |
| **Citations** | Every answer returns top-K source chunks with similarity scores |
| **Frontend** | React 18 + React Router, dark intel theme matching Figma design |
| **Live Network Graph** | Canvas-animated node graph with physics simulation |
| **System Monitoring** | Real-time logs, FAISS stats, FastAPI metrics |

---

## Supported File Types

| Extension | Parser |
|---|---|
| `.pdf` | `pypdf` |
| `.txt` | UTF-8 decode |
| `.docx` | UTF-8 decode (raw text) |

> **Phase 2 upgrade:** Add `python-docx` for proper DOCX extraction, `pypdf` OCR for scanned PDFs.

---

## Configuration

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | — | **Required.** Your OpenAI API key |
| `EMBEDDING_MODEL` | `text-embedding-ada-002` | Embedding model |
| `CHUNK_SIZE` | `500` | Tokens per chunk |
| `CHUNK_OVERLAP` | `50` | Overlap between chunks |
| `TOP_K` | `5` | Retrieved chunks per query |

---

## Roadmap

### Phase 2
- [ ] Persist FAISS index to disk (`faiss.write_index`)
- [ ] Proper DOCX parsing with `python-docx`
- [ ] Chunk overlap deduplication
- [ ] Authentication (JWT)

### Phase 3
- [ ] Multi-user support with isolated indexes
- [ ] Chat history persistence (PostgreSQL)
- [ ] Streaming responses (SSE)
- [ ] Re-ranking with cross-encoder

### Phase 4
- [ ] Role-based access control
- [ ] Dashboard analytics
- [ ] LangChain integration
- [ ] Open-source model support (Ollama)

---

## Security Notes

- Never commit your `OPENAI_API_KEY` — use `.env` files or secrets managers
- Validate file uploads (type + size limits) before processing
- Add rate limiting to `/upload` and `/query` in production
- Index is in-memory — restart clears all data (Phase 2 adds persistence)

---

## License

MIT
