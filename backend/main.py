"""
AIDA — AI Intelligence Document Analyzer
FastAPI RAG Backend
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import numpy as np
import os
import io
import time
import json
import faiss
import tiktoken
from openai import OpenAI
from typing import Optional
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)-8s %(message)s")
logger = logging.getLogger("aida")

app = FastAPI(title="AIDA System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory store ──────────────────────────────────────────────────
EMBEDDING_MODEL = "text-embedding-ada-002"
EMBEDDING_DIM    = 1536
CHUNK_SIZE       = 500   # tokens per chunk
CHUNK_OVERLAP    = 50
TOP_K            = 5

client: Optional[OpenAI] = None
index: faiss.Index = faiss.IndexFlatIP(EMBEDDING_DIM)  # cosine via normalised vectors
chunk_store: list[dict] = []   # [{text, source, chunk_id}]
doc_registry: list[dict] = []  # [{name, chunks, ingested_at, status}]

def get_client() -> OpenAI:
    global client
    if client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY not set")
        client = OpenAI(api_key=api_key)
    return client


# ── Text chunking ────────────────────────────────────────────────────
def chunk_text(text: str, source: str) -> list[dict]:
    enc = tiktoken.get_encoding("cl100k_base")
    tokens = enc.encode(text)
    chunks = []
    start = 0
    while start < len(tokens):
        end = min(start + CHUNK_SIZE, len(tokens))
        chunk_tokens = tokens[start:end]
        chunk_text_ = enc.decode(chunk_tokens)
        chunks.append({"text": chunk_text_, "source": source, "chunk_id": len(chunk_store) + len(chunks)})
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


def embed_texts(texts: list[str]) -> np.ndarray:
    cl = get_client()
    response = cl.embeddings.create(model=EMBEDDING_MODEL, input=texts)
    vecs = np.array([r.embedding for r in response.data], dtype="float32")
    # L2-normalise for cosine similarity with IndexFlatIP
    norms = np.linalg.norm(vecs, axis=1, keepdims=True)
    vecs = vecs / np.maximum(norms, 1e-9)
    return vecs


# ── API: health ──────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "vectors": index.ntotal,
        "documents": len(doc_registry),
        "chunks": len(chunk_store),
    }


# ── API: upload ──────────────────────────────────────────────────────
@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    t0 = time.time()
    raw = await file.read()
    filename = file.filename or "unknown"

    # Extract text
    if filename.endswith(".pdf"):
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(raw))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"PDF parse error: {e}")
    else:
        try:
            text = raw.decode("utf-8", errors="replace")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Decode error: {e}")

    if not text.strip():
        raise HTTPException(status_code=400, detail="No text extracted from file")

    # Chunk → embed → index
    chunks = chunk_text(text, filename)
    vecs = embed_texts([c["text"] for c in chunks])
    index.add(vecs)
    chunk_store.extend(chunks)

    elapsed = round(time.time() - t0, 2)
    doc_registry.append({
        "name": filename,
        "chunks": len(chunks),
        "ingested_at": time.strftime("%Y-%m-%d %H:%M"),
        "status": "Indexed",
        "elapsed_s": elapsed,
    })
    logger.info(f"Ingested '{filename}' → {len(chunks)} chunks in {elapsed}s")
    return {"message": "Document processed successfully", "chunks": len(chunks), "elapsed_s": elapsed}


# ── API: query ───────────────────────────────────────────────────────
class QueryRequest(BaseModel):
    query: str

@app.post("/query")
async def query(req: QueryRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Empty query")

    if index.ntotal == 0:
        # No documents yet — answer from general knowledge
        context_str = "(No documents have been uploaded yet. Answer from general intelligence analysis knowledge.)"
        citations = []
    else:
        # Embed query + search
        q_vec = embed_texts([req.query])
        scores, ids = index.search(q_vec, min(TOP_K, index.ntotal))
        citations = []
        context_parts = []
        for score, idx in zip(scores[0], ids[0]):
            if idx < 0 or idx >= len(chunk_store):
                continue
            chunk = chunk_store[idx]
            citations.append({
                "chunk_id": int(idx),
                "score": round(float(score), 4),
                "source": chunk["source"],
                "text": chunk["text"][:400],
            })
            context_parts.append(f"[Source: {chunk['source']}]\n{chunk['text']}")
        context_str = "\n\n---\n\n".join(context_parts)

    # Generate answer
    cl = get_client()
    system_prompt = """You are AIDA — an AI Intelligence Document Analyzer specialising in cybersecurity, financial forensics, and entity relationship analysis. 
Analyse the retrieved context and answer the user's query with professional precision.
Highlight key entities, anomalies, and actionable insights. Be concise but thorough.
If the context lacks relevant info, say so clearly and answer from general knowledge."""

    chat_response = cl.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Context:\n{context_str}\n\nQuery: {req.query}"},
        ],
        temperature=0.3,
        max_tokens=600,
    )
    answer = chat_response.choices[0].message.content

    return {"answer": answer, "citations": citations}


# ── API: documents list ──────────────────────────────────────────────
@app.get("/documents")
def list_documents():
    return {"documents": doc_registry, "total_vectors": index.ntotal}


# ── API: system stats ────────────────────────────────────────────────
@app.get("/stats")
def stats():
    return {
        "vectors": index.ntotal,
        "documents": len(doc_registry),
        "chunks": len(chunk_store),
        "embedding_model": EMBEDDING_MODEL,
        "embedding_dim": EMBEDDING_DIM,
        "index_type": "IndexFlatIP (cosine)",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
