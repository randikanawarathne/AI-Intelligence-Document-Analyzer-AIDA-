"""
AIDA — AI Intelligence Document Analyzer
Next-Generation Multi-Provider RAG & Intelligence Analysis Backend
"""

import os
import io
import re
import time
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import numpy as np

# Load environment variables if .env exists
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("aida-core")

app = FastAPI(
    title="AIDA — AI Intelligence Document Analyzer API",
    description="Next-Gen Production RAG & Relational Intelligence Engine",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Optional ML & Vector Libraries with Graceful Fallbacks ───────────
try:
    import tiktoken
    ENC = tiktoken.get_encoding("cl100k_base")
except Exception:
    ENC = None

try:
    import faiss
    HAS_FAISS = True
except Exception:
    HAS_FAISS = False
    logger.warning("FAISS not installed or failed to load. Using High-Performance NumPy Vector Space fallback.")

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    HAS_SKLEARN = True
except Exception:
    HAS_SKLEARN = False

try:
    import pypdf
    HAS_PYPDF = True
except Exception:
    HAS_PYPDF = False

# ── Global State & Configuration ─────────────────────────────────────
CONFIG = {
    "provider": os.getenv("LLM_PROVIDER", "ollama"),  # ollama, openai, gemini, fallback
    "embedding_model": os.getenv("EMBEDDING_MODEL", "nomic-embed-text"),
    "embedding_dim": 1536,
    "chunk_size": int(os.getenv("CHUNK_SIZE", "450")),
    "chunk_overlap": int(os.getenv("CHUNK_OVERLAP", "50")),
    "top_k": int(os.getenv("TOP_K", "5")),
    "ollama_host": os.getenv("OLLAMA_HOST", "http://localhost:11434").rstrip("/"),
    "ollama_model": os.getenv("OLLAMA_MODEL", "llama3.2"),
    "ollama_embed_model": os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text"),
}

START_TIME = time.time()
chunk_store: List[Dict[str, Any]] = []
doc_registry: List[Dict[str, Any]] = []
vector_store: Optional[np.ndarray] = None  # Float32 normalized embeddings matrix
tfidf_vectorizer: Optional[Any] = None
tfidf_matrix: Optional[Any] = None
faiss_index: Optional[Any] = None

# ── Entity Extraction Regex Patterns (Cyber & Intelligence NER) ──────
PATTERNS = {
    "cve": re.compile(r"\bCVE-\d{4}-\d{4,7}\b", re.IGNORECASE),
    "ipv4": re.compile(r"\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b"),
    "email": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"),
    "money": re.compile(r"(?:\$|€|£|¥)\s?\d+(?:,\d{3})*(?:\.\d{2})?(?:\s?(?:million|billion|trillion|k|m|b))?\b|\b\d+(?:,\d{3})*(?:\.\d{2})?\s?(?:USD|EUR|GBP|BTC|USDT)\b", re.IGNORECASE),
    "domain": re.compile(r"\b(?:[a-zA-Z0-9-]+\.)+(?:com|org|net|gov|mil|edu|io|ru|cn|ir|kp|cc|xyz)\b", re.IGNORECASE),
    "hash_sha256": re.compile(r"\b[a-fA-F0-9]{64}\b"),
    "threat_actor": re.compile(r"\b(?:APT[- ]?\d+|Lazarus|Fancy Bear|Cozy Bear|LockBit|BlackCat|Volt Typhoon|Sandworm|DarkSide|REvil|FIN\d+)\b", re.IGNORECASE),
    "org_keyword": re.compile(r"\b[A-Z][A-Za-z0-9&\-\.]{2,}(?:\s+[A-Z][A-Za-z0-9&\-\.]{2,})*\s+(?:Inc|Corp|Corporation|LLC|Ltd|Group|Holdings|Bank|Department|Agency|DoD|CISA|Interpol|FBI|NSA|CIA|Treasury|Minist(?:ry|ère))\b"),
    "location_keyword": re.compile(r"\b(?:United States|Russia|China|Iran|North Korea|Ukraine|Germany|United Kingdom|Japan|Taiwan|Switzerland|Geneva|London|Moscow|Beijing|Tehran|Pyongyang|Washington|New York|Dubai|Singapore)\b", re.IGNORECASE)
}


def extract_entities(text: str) -> Dict[str, List[str]]:
    """Extract named intelligence entities, cyber IOCs, and financial anomalies."""
    res: Dict[str, List[str]] = {
        "threat_actors": list(set(PATTERNS["threat_actor"].findall(text))),
        "cves": list(set(PATTERNS["cve"].findall(text))),
        "ips": list(set(PATTERNS["ipv4"].findall(text)))[:10],
        "domains": list(set(PATTERNS["domain"].findall(text)))[:10],
        "financials": list(set(PATTERNS["money"].findall(text)))[:10],
        "organizations": list(set(PATTERNS["org_keyword"].findall(text)))[:10],
        "locations": list(set(PATTERNS["location_keyword"].findall(text)))[:10],
        "hashes": list(set(PATTERNS["hash_sha256"].findall(text)))[:5],
    }
    return {k: v for k, v in res.items() if v}


def count_tokens(text: str) -> int:
    if ENC:
        try:
            return len(ENC.encode(text))
        except Exception:
            pass
    return max(1, len(text.split()) * 4 // 3)


def chunk_text(text: str, source: str) -> List[Dict[str, Any]]:
    chunk_size = CONFIG["chunk_size"]
    overlap = CONFIG["chunk_overlap"]
    chunks: List[Dict[str, Any]] = []

    clean = re.sub(r"\r\n", "\n", text)
    clean = re.sub(r"\n{3,}", "\n\n", clean)

    if ENC:
        tokens = ENC.encode(clean)
        start = 0
        while start < len(tokens):
            end = min(start + chunk_size, len(tokens))
            chunk_tokens = tokens[start:end]
            chunk_str = ENC.decode(chunk_tokens)
            cid = len(chunk_store) + len(chunks)
            ents = extract_entities(chunk_str)
            chunks.append({
                "chunk_id": cid,
                "text": chunk_str.strip(),
                "source": source,
                "token_count": len(chunk_tokens),
                "entities": ents,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            start += max(1, chunk_size - overlap)
    else:
        words = clean.split()
        start = 0
        step = max(10, chunk_size - overlap)
        while start < len(words):
            end = min(start + chunk_size, len(words))
            chunk_str = " ".join(words[start:end])
            cid = len(chunk_store) + len(chunks)
            ents = extract_entities(chunk_str)
            chunks.append({
                "chunk_id": cid,
                "text": chunk_str.strip(),
                "source": source,
                "token_count": len(words[start:end]),
                "entities": ents,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            start += step

    return [c for c in chunks if c["text"].strip()]


# ── Ollama Helper & Connection Inspector ──────────────────────────────
def get_ollama_status() -> Dict[str, Any]:
    """Check connectivity to local Ollama instance and query available models."""
    host = CONFIG.get("ollama_host", "http://localhost:11434").rstrip("/")
    try:
        import httpx
        with httpx.Client(timeout=1.5) as client:
            resp = client.get(f"{host}/api/tags")
            if resp.status_code == 200:
                data = resp.json()
                models = [m.get("name") for m in data.get("models", [])]
                return {
                    "online": True,
                    "host": host,
                    "active_model": CONFIG.get("ollama_model", "llama3.2"),
                    "active_embed_model": CONFIG.get("ollama_embed_model", "nomic-embed-text"),
                    "available_models": models,
                }
    except Exception as e:
        logger.debug(f"Ollama check offline at {host}: {e}")
    return {
        "online": False,
        "host": host,
        "active_model": CONFIG.get("ollama_model", "llama3.2"),
        "active_embed_model": CONFIG.get("ollama_embed_model", "nomic-embed-text"),
        "available_models": [],
    }


def compute_ollama_embeddings(texts: List[str]) -> Optional[np.ndarray]:
    """Generate dense embeddings using local Ollama model (e.g. nomic-embed-text or llama3.2)."""
    host = CONFIG.get("ollama_host", "http://localhost:11434").rstrip("/")
    model = CONFIG.get("ollama_embed_model") or CONFIG.get("ollama_model", "llama3.2")
    try:
        import httpx
        emb_list = []
        with httpx.Client(timeout=30.0) as client:
            for text in texts:
                resp = client.post(
                    f"{host}/api/embeddings",
                    json={"model": model, "prompt": text}
                )
                if resp.status_code == 200:
                    emb = resp.json().get("embedding")
                    if emb:
                        emb_list.append(emb)
                else:
                    return None
        if len(emb_list) == len(texts):
            vecs = np.array(emb_list, dtype="float32")
            norms = np.linalg.norm(vecs, axis=1, keepdims=True)
            return vecs / np.maximum(norms, 1e-9)
    except Exception as e:
        logger.debug(f"Ollama embedding computation skipped: {e}")
    return None


# ── Embedding & Vector Index Management ──────────────────────────────
def get_openai_client():
    key = os.getenv("OPENAI_API_KEY")
    if not key or "your-key" in key or key.strip() == "":
        return None
    try:
        from openai import OpenAI
        return OpenAI(api_key=key, timeout=3.0, max_retries=0)
    except Exception as e:
        logger.error(f"OpenAI init failed: {e}")
        return None


def get_gemini_client():
    key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not key or "your-key" in key or key.strip() == "":
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=key)
        return genai
    except Exception as e:
        logger.error(f"Gemini init failed: {e}")
        return None


def compute_embeddings(texts: List[str]) -> Optional[np.ndarray]:
    """Generate normalized dense embeddings prioritizing Ollama, then OpenAI/Gemini/Fallback."""
    provider = CONFIG.get("provider", "ollama")

    # 1. Try Ollama (Default & User Preferred)
    if provider in ("ollama", "auto"):
        ollama_vecs = compute_ollama_embeddings(texts)
        if ollama_vecs is not None:
            return ollama_vecs

    # 2. Try OpenAI (if configured)
    if provider in ("openai", "auto"):
        cl = get_openai_client()
        if cl:
            try:
                model = CONFIG["embedding_model"]
                resp = cl.embeddings.create(model=model, input=texts)
                vecs = np.array([r.embedding for r in resp.data], dtype="float32")
                norms = np.linalg.norm(vecs, axis=1, keepdims=True)
                return vecs / np.maximum(norms, 1e-9)
            except Exception as e:
                logger.warning(f"OpenAI embedding call failed: {e}")

    # 3. Try Gemini (if configured)
    if provider in ("gemini", "auto"):
        gem = get_gemini_client()
        if gem:
            try:
                emb_list = []
                for t in texts:
                    res = gem.embed_content(model="models/text-embedding-004", content=t)
                    emb_list.append(res['embedding'])
                vecs = np.array(emb_list, dtype="float32")
                norms = np.linalg.norm(vecs, axis=1, keepdims=True)
                return vecs / np.maximum(norms, 1e-9)
            except Exception as e:
                logger.warning(f"Gemini embedding call failed: {e}")

    return None


def rebuild_index():
    """Rebuilds FAISS index, NumPy vector matrix, and TF-IDF fallback matrix."""
    global vector_store, tfidf_vectorizer, tfidf_matrix, faiss_index

    if not chunk_store:
        vector_store = None
        tfidf_vectorizer = None
        tfidf_matrix = None
        faiss_index = None
        return

    all_texts = [c["text"] for c in chunk_store]

    # Rebuild TF-IDF
    if HAS_SKLEARN and all_texts:
        try:
            tfidf_vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english", max_features=10000)
            tfidf_matrix = tfidf_vectorizer.fit_transform(all_texts)
        except Exception as e:
            logger.error(f"TF-IDF rebuild error: {e}")

    # Rebuild Dense Embeddings (Ollama / Dense vectors)
    dense_vecs = compute_embeddings(all_texts)
    if dense_vecs is not None:
        vector_store = dense_vecs
        if HAS_FAISS:
            try:
                dim = dense_vecs.shape[1]
                idx = faiss.IndexFlatIP(dim)
                idx.add(dense_vecs)
                faiss_index = idx
            except Exception as e:
                logger.error(f"FAISS index rebuild error: {e}")
                faiss_index = None


def search_similar_chunks(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """Search knowledge corpus using hybrid dense + sparse search with similarity scores."""
    if not chunk_store:
        return []

    results = []

    # 1. Try Dense Vector Search (Ollama / Dense FAISS or NumPy)
    q_vec = compute_embeddings([query])
    if q_vec is not None and vector_store is not None and len(vector_store) == len(chunk_store):
        try:
            if faiss_index is not None:
                scores, ids = faiss_index.search(q_vec, min(top_k, len(chunk_store)))
                for score, idx in zip(scores[0], ids[0]):
                    if 0 <= idx < len(chunk_store):
                        results.append({
                            "chunk": chunk_store[idx],
                            "score": float(score),
                            "method": "dense_faiss_ollama"
                        })
            else:
                sims = np.dot(vector_store, q_vec.T).squeeze()
                if sims.ndim == 0:
                    sims = np.array([sims])
                top_indices = np.argsort(sims)[::-1][:top_k]
                for idx in top_indices:
                    results.append({
                        "chunk": chunk_store[idx],
                        "score": float(sims[idx]),
                        "method": "dense_cosine_ollama"
                    })
        except Exception as e:
            logger.warning(f"Dense vector search failed: {e}")

    # 2. Sparse / TF-IDF Search (High-speed fallback & keyword booster)
    if not results and tfidf_vectorizer and tfidf_matrix is not None:
        try:
            q_tfidf = tfidf_vectorizer.transform([query])
            sims = cosine_similarity(q_tfidf, tfidf_matrix).squeeze()
            if sims.ndim == 0:
                sims = np.array([sims])
            top_indices = np.argsort(sims)[::-1][:top_k]
            for idx in top_indices:
                score = float(sims[idx])
                if score > 0.01:
                    results.append({
                        "chunk": chunk_store[idx],
                        "score": score,
                        "method": "sparse_tfidf"
                    })
        except Exception as e:
            logger.error(f"TF-IDF search error: {e}")

    # 3. Simple Keyword Match Fallback if all else fails
    if not results:
        q_words = set(re.findall(r"\w+", query.lower()))
        scored = []
        for c in chunk_store:
            c_words = set(re.findall(r"\w+", c["text"].lower()))
            overlap = len(q_words & c_words)
            if overlap > 0:
                scored.append((overlap / max(1, len(q_words)), c))
        scored.sort(key=lambda x: x[0], reverse=True)
        for sc, c in scored[:top_k]:
            results.append({
                "chunk": c,
                "score": float(sc),
                "method": "keyword_overlap"
            })

    return results


# ── Multi-Provider LLM Answer Generation ─────────────────────────────
def generate_intelligence_response(query: str, context_str: str, citations: List[Dict[str, Any]]) -> str:
    """Generate synthesized intelligence answer prioritizing Ollama Local LLM, then OpenAI/Gemini/Fallback."""
    system_prompt = """You are AIDA (AI Intelligence Document Analyzer) — a tier-1 intelligence analysis platform specializing in cybersecurity, threat intelligence, entity relationships, and financial forensics.
Analyze the retrieved context passages and answer the query with rigorous analytical clarity.
Structure your analysis when helpful:
- **Executive Summary / Findings**
- **Key Entities & Threat Indicators**
- **Evidence & Corroboration** (referencing retrieved sources)
- **Actionable Risk Assessment & Recommendations**
If the context lacks specific information, state the gap clearly and provide analytical deductions based on general intelligence standards."""

    provider = CONFIG.get("provider", "ollama")

    # 1. Try Ollama (Local & Preferred)
    if provider in ("ollama", "auto"):
        host = CONFIG.get("ollama_host", "http://localhost:11434").rstrip("/")
        model = CONFIG.get("ollama_model", "llama3.2")
        try:
            import httpx
            with httpx.Client(timeout=45.0) as client:
                prompt_content = f"{system_prompt}\n\nRETRIEVED CONTEXT:\n{context_str}\n\nUSER QUERY: {query}"
                resp = client.post(
                    f"{host}/api/generate",
                    json={
                        "model": model,
                        "prompt": prompt_content,
                        "stream": False,
                        "options": {"temperature": 0.2}
                    }
                )
                if resp.status_code == 200:
                    ans = resp.json().get("response", "").strip()
                    if ans:
                        return f"### 🦙 Ollama Local Intelligence ({model})\n\n{ans}"
        except Exception as e:
            logger.debug(f"Ollama generation skipped or offline: {e}")

    # 2. Try OpenAI (if explicitly selected or configured)
    if provider == "openai":
        cl = get_openai_client()
        if cl:
            try:
                resp = cl.chat.completions.create(
                    model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"RETRIEVED CONTEXT:\n{context_str}\n\nUSER QUERY: {query}"}
                    ],
                    temperature=0.2,
                    max_tokens=900,
                )
                return resp.choices[0].message.content or "No response generated."
            except Exception as e:
                logger.warning(f"OpenAI generation error: {e}")

    # 3. Try Gemini (if explicitly selected or configured)
    if provider == "gemini":
        gem = get_gemini_client()
        if gem:
            try:
                model = gem.GenerativeModel(os.getenv("GEMINI_MODEL", "gemini-1.5-flash"))
                prompt = f"{system_prompt}\n\nRETRIEVED CONTEXT:\n{context_str}\n\nUSER QUERY: {query}"
                resp = model.generate_content(prompt)
                return resp.text or "No response generated."
            except Exception as e:
                logger.warning(f"Gemini generation error: {e}")

    # 4. High-Performance Built-in Smart Synthesizer (Zero-Key Offline Fallback)
    if not citations:
        return f"**AIDA System Intelligence Analysis**\n\nNo uploaded document records matched the query `\"{query}\"`. Ingest intelligence files into the Knowledge Base or ensure Ollama is running (`ollama run {CONFIG.get('ollama_model', 'llama3.2')}`)."

    # Extract key sentences from top citations
    bullet_points = []
    for c in citations[:3]:
        text_snip = c.get("text", "")
        src = c.get("source", "Document")
        score = c.get("score", 0.0)
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text_snip) if len(s.strip()) > 15][:2]
        for s in sentences:
            bullet_points.append(f"- **[{src} | Match: {int(score*100)}%]** {s}")

    all_ents = []
    for c in citations:
        ents = c.get("entities", {})
        for cat, vals in ents.items():
            for v in vals:
                all_ents.append(f"`{v}` ({cat.replace('_', ' ').title()})")
    ent_summary = ", ".join(list(dict.fromkeys(all_ents))[:8]) if all_ents else "None extracted in top chunks"

    return f"""### 🛡️ AIDA Local Intelligence Synthesis

**Analytical Finding:**
Based on semantic analysis of **{len(citations)} retrieved context chunk(s)** across the document corpus, the following key findings directly address: *"{query}"*:

{chr(10).join(bullet_points)}

---

**Detected Intelligence Entities & Indicators:**
{ent_summary}

---

**Confidence & Integrity:**
- **Top Match Score:** {int(citations[0]['score'] * 100)}%
- **Correlation Method:** {citations[0].get('method', 'Hybrid Neural Vector')}
- **Corroborating Sources:** {", ".join(list(set(c['source'] for c in citations)))}
"""
    return response_text


# ── API Endpoints ────────────────────────────────────────────────────

@app.get("/health")
def health():
    """Health check endpoint with system telemetry."""
    ollama_stat = get_ollama_status()
    if ollama_stat["online"]:
        active_llm = f"🦙 Ollama Local ({ollama_stat['active_model']})"
    elif os.getenv("OPENAI_API_KEY") and CONFIG.get("provider") == "openai":
        active_llm = f"OpenAI ({os.getenv('OPENAI_MODEL', 'gpt-4o-mini')})"
    elif (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")) and CONFIG.get("provider") == "gemini":
        active_llm = f"Google Gemini ({os.getenv('GEMINI_MODEL', 'gemini-1.5-flash')})"
    else:
        active_llm = "AIDA Local Neural Engine"

    return {
        "status": "online",
        "system": "AIDA Intelligence Platform",
        "version": "2.0.0",
        "uptime_seconds": round(time.time() - START_TIME, 1),
        "vectors": len(chunk_store),
        "documents": len(doc_registry),
        "chunks": len(chunk_store),
        "active_provider": active_llm,
        "ollama": ollama_stat,
        "vector_engine": "FAISS IndexFlatIP" if faiss_index is not None else "NumPy Cosine Space",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.get("/ollama/status")
def ollama_status():
    """Returns real-time status and available models from local Ollama instance."""
    return get_ollama_status()


class OllamaConfigReq(BaseModel):
    host: Optional[str] = None
    model: Optional[str] = None
    embed_model: Optional[str] = None


@app.post("/ollama/configure")
def configure_ollama(req: OllamaConfigReq):
    """Dynamically update Ollama host and model configuration."""
    if req.host:
        CONFIG["ollama_host"] = req.host.rstrip("/")
    if req.model:
        CONFIG["ollama_model"] = req.model
    if req.embed_model:
        CONFIG["ollama_embed_model"] = req.embed_model
    CONFIG["provider"] = "ollama"
    return {"message": "Ollama configuration updated", "config": get_ollama_status()}


@app.get("/stats")
def get_stats():
    """System statistics and capacity metrics."""
    total_tokens = sum(c.get("token_count", 0) for c in chunk_store)
    total_entities = sum(sum(len(v) for v in c.get("entities", {}).values()) for c in chunk_store)
    return {
        "vectors": len(chunk_store),
        "documents": len(doc_registry),
        "chunks": len(chunk_store),
        "total_tokens": total_tokens,
        "total_entities_detected": total_entities,
        "provider": CONFIG["provider"],
        "ollama": get_ollama_status(),
        "embedding_model": CONFIG["embedding_model"],
        "embedding_dim": CONFIG["embedding_dim"],
        "chunk_size": CONFIG["chunk_size"],
        "chunk_overlap": CONFIG["chunk_overlap"],
        "top_k": CONFIG["top_k"],
        "has_faiss": HAS_FAISS,
        "has_pypdf": HAS_PYPDF,
    }


@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload and ingest a document (.pdf, .docx, .txt, .csv, .json, .md)."""
    t0 = time.time()
    filename = file.filename or "unnamed_file.txt"
    raw = await file.read()

    text = ""
    # 1. PDF Parser
    if filename.lower().endswith(".pdf"):
        if not HAS_PYPDF:
            raise HTTPException(status_code=500, detail="pypdf library not available on server")
        try:
            reader = pypdf.PdfReader(io.BytesIO(raw))
            text = "\n\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"PDF extraction error: {e}")

    # 2. DOCX Parser
    elif filename.lower().endswith(".docx"):
        try:
            import zipfile
            import xml.etree.ElementTree as ET
            with zipfile.ZipFile(io.BytesIO(raw)) as zf:
                xml_content = zf.read("word/document.xml")
                tree = ET.fromstring(xml_content)
                text = " ".join(node.text for node in tree.iter() if node.text)
        except Exception:
            text = raw.decode("utf-8", errors="replace")

    # 3. Plain text / CSV / JSON / MD
    else:
        try:
            text = raw.decode("utf-8", errors="replace")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Text decoding error: {e}")

    if not text.strip():
        raise HTTPException(status_code=400, detail="Document contains no extractable text")

    # Chunk text
    new_chunks = chunk_text(text, filename)
    chunk_store.extend(new_chunks)

    # Rebuild index
    rebuild_index()

    elapsed = round(time.time() - t0, 2)
    doc_meta = {
        "name": filename,
        "chunks": len(new_chunks),
        "tokens": sum(c["token_count"] for c in new_chunks),
        "size_bytes": len(raw),
        "ingested_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "status": "Indexed",
        "elapsed_s": elapsed,
        "preview": text[:300] + "..." if len(text) > 300 else text,
        "entity_counts": sum(len(v) for c in new_chunks for v in c.get("entities", {}).values())
    }

    # Avoid duplicate doc registry names
    doc_registry[:] = [d for d in doc_registry if d["name"] != filename]
    doc_registry.append(doc_meta)

    logger.info(f"Ingested '{filename}' → {len(new_chunks)} chunks, {doc_meta['tokens']} tokens in {elapsed}s")
    return {
        "message": f"Successfully ingested '{filename}'",
        "chunks": len(new_chunks),
        "tokens": doc_meta["tokens"],
        "elapsed_s": elapsed,
        "document": doc_meta
    }


class QueryRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5
    filter_source: Optional[str] = None


@app.post("/query")
async def query_corpus(req: QueryRequest):
    """Semantic RAG query across ingested intelligence documents."""
    q = req.query.strip()
    if not q:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    top_k = req.top_k or CONFIG["top_k"]
    t0 = time.time()

    matched = search_similar_chunks(q, top_k=top_k)

    # Filter by source if requested
    if req.filter_source:
        matched = [m for m in matched if m["chunk"]["source"] == req.filter_source]

    citations = []
    context_parts = []

    for item in matched:
        c = item["chunk"]
        sc = round(item["score"], 4)
        citations.append({
            "chunk_id": c["chunk_id"],
            "score": sc,
            "source": c["source"],
            "text": c["text"],
            "entities": c.get("entities", {}),
            "method": item.get("method", "vector")
        })
        context_parts.append(f"[Document: {c['source']} | Chunk: {c['chunk_id']}]\n{c['text']}")

    context_str = "\n\n---\n\n".join(context_parts)
    answer = generate_intelligence_response(q, context_str, citations)
    elapsed = round((time.time() - t0) * 1000, 1)

    return {
        "query": q,
        "answer": answer,
        "citations": citations,
        "latency_ms": elapsed,
        "context_count": len(citations),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.get("/documents")
def list_documents():
    """Retrieve list of all ingested documents."""
    return {
        "documents": doc_registry,
        "total_documents": len(doc_registry),
        "total_chunks": len(chunk_store),
    }


@app.delete("/documents/{filename}")
def delete_document(filename: str):
    """Remove a document from the corpus and rebuild index."""
    global chunk_store, doc_registry
    prev_chunk_count = len(chunk_store)
    chunk_store = [c for c in chunk_store if c["source"] != filename]
    doc_registry = [d for d in doc_registry if d["name"] != filename]

    rebuild_index()
    removed_chunks = prev_chunk_count - len(chunk_store)
    logger.info(f"Removed document '{filename}' (-{removed_chunks} chunks)")

    return {
        "message": f"Document '{filename}' deleted",
        "removed_chunks": removed_chunks,
        "remaining_documents": len(doc_registry),
        "remaining_chunks": len(chunk_store)
    }


@app.get("/documents/{filename}/preview")
def preview_document(filename: str):
    """Retrieve all chunks and extracted entities for a document."""
    chunks = [c for c in chunk_store if c["source"] == filename]
    if not chunks:
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "filename": filename,
        "chunk_count": len(chunks),
        "chunks": chunks
    }


@app.get("/intel/entities")
def get_extracted_entities():
    """Get aggregated entity breakdown for the intelligence hub."""
    entities_by_type: Dict[str, Dict[str, int]] = {
        "organizations": {},
        "threat_actors": {},
        "locations": {},
        "cves": {},
        "ips": {},
        "financials": {},
        "domains": {},
    }

    for c in chunk_store:
        ents = c.get("entities", {})
        for cat, items in ents.items():
            if cat in entities_by_type:
                for item in items:
                    entities_by_type[cat][item] = entities_by_type[cat].get(item, 0) + 1

    return {
        "entities": {
            k: sorted([{"name": name, "count": count} for name, count in v.items()], key=lambda x: x["count"], reverse=True)
            for k, v in entities_by_type.items()
        },
        "total_unique": sum(len(v) for v in entities_by_type.values())
    }


@app.get("/intel/graph")
def get_knowledge_graph():
    """Generate dynamic node and edge graph data for the relational knowledge map."""
    nodes = []
    edges = []
    node_id_map = {}

    # 1. Document Nodes
    for i, doc in enumerate(doc_registry):
        nid = f"doc_{i}"
        node_id_map[doc["name"]] = nid
        nodes.append({
            "id": nid,
            "label": doc["name"],
            "type": "document",
            "size": 16,
            "color": "#4edea3",
            "chunks": doc.get("chunks", 1),
        })

    # 2. Entity Nodes & Edges to Documents
    entity_counts = {}
    entity_to_docs = {}
    for c in chunk_store:
        src = c["source"]
        for cat, items in c.get("entities", {}).items():
            for item in items:
                entity_counts[item] = entity_counts.get(item, 0) + 1
                if item not in entity_to_docs:
                    entity_to_docs[item] = {"category": cat, "docs": set()}
                entity_to_docs[item]["docs"].add(src)

    color_map = {
        "organizations": "#3b82f6",
        "threat_actors": "#f43f5e",
        "locations": "#a855f7",
        "cves": "#ef4444",
        "ips": "#10b981",
        "financials": "#f59e0b",
        "domains": "#06b6d4"
    }

    e_idx = 0
    for ent, data in entity_to_docs.items():
        if e_idx >= 60:  # Cap at top 60 entity nodes for graph clarity
            break
        cat = data["category"]
        count = entity_counts.get(ent, 1)
        nid = f"ent_{e_idx}"
        nodes.append({
            "id": nid,
            "label": ent,
            "type": cat,
            "size": min(22, 8 + count * 2),
            "color": color_map.get(cat, "#94a3b8"),
            "category": cat,
            "occurrences": count
        })
        for doc_name in data["docs"]:
            if doc_name in node_id_map:
                edges.append({
                    "source": node_id_map[doc_name],
                    "target": nid,
                    "strength": 0.8
                })
        e_idx += 1

    # Add sample seed nodes if no documents uploaded yet
    if not nodes:
        sample_nodes = [
            {"id": "s_aida", "label": "AIDA Neural Hub", "type": "core", "size": 22, "color": "#4edea3"},
            {"id": "s_cisa", "label": "CISA Advisory", "type": "organizations", "size": 14, "color": "#3b82f6"},
            {"id": "s_apt29", "label": "APT29 (Cozy Bear)", "type": "threat_actors", "size": 16, "color": "#f43f5e"},
            {"id": "s_cve", "label": "CVE-2024-38812", "type": "cves", "size": 13, "color": "#ef4444"},
            {"id": "s_crypto", "label": "$4.2M Transferred", "type": "financials", "size": 12, "color": "#f59e0b"},
            {"id": "s_ip", "label": "194.26.29.112", "type": "ips", "size": 11, "color": "#10b981"},
            {"id": "s_loc", "label": "Frankfurt Hub", "type": "locations", "size": 12, "color": "#a855f7"},
        ]
        sample_edges = [
            {"source": "s_aida", "target": "s_cisa"},
            {"source": "s_aida", "target": "s_apt29"},
            {"source": "s_apt29", "target": "s_cve"},
            {"source": "s_apt29", "target": "s_ip"},
            {"source": "s_cisa", "target": "s_cve"},
            {"source": "s_ip", "target": "s_crypto"},
            {"source": "s_crypto", "target": "s_loc"},
        ]
        return {"nodes": sample_nodes, "edges": sample_edges, "is_sample": True}

    return {"nodes": nodes, "edges": edges, "is_sample": False}


class DossierRequest(BaseModel):
    title: Optional[str] = "Intelligence Briefing Dossier"
    classification: Optional[str] = "CONFIDENTIAL // LAW ENFORCEMENT SENSITIVE"
    include_entities: Optional[bool] = True
    include_citations: Optional[bool] = True


@app.post("/export/dossier")
def export_dossier(req: DossierRequest):
    """Generate a structured, publication-ready intelligence dossier."""
    total_docs = len(doc_registry)
    total_chunks = len(chunk_store)
    entities = get_extracted_entities()["entities"]

    doc_list_md = "\n".join([f"- **{d['name']}** ({d['chunks']} chunks, ingested {d['ingested_at']})" for d in doc_registry]) or "- *No documents currently ingested.*"

    threats = ", ".join([e["name"] for e in entities.get("threat_actors", [])[:6]]) or "No specific threat actors cataloged."
    cves = ", ".join([e["name"] for e in entities.get("cves", [])[:6]]) or "No CVE identifiers cataloged."
    financials = ", ".join([e["name"] for e in entities.get("financials", [])[:6]]) or "No financial anomalies identified."

    report_markdown = f"""# {req.title.upper()}
**Classification:** {req.classification}  
**Date of Assessment:** {datetime.now().strftime("%B %d, %Y - %H:%M UTC")}  
**System Origin:** AIDA AI Intelligence Document Analyzer (v2.0)  

---

## 1. Executive Summary
This intelligence dossier consolidates multi-source document ingestion, automated entity correlation, and semantic vector indexing across **{total_docs} primary intelligence sources** ({total_chunks} indexed context vectors).

## 2. Ingested Evidence Inventory
{doc_list_md}

## 3. Threat Matrix & Key Indicators
- **Threat Actors & Groups Identified:** {threats}
- **Vulnerabilities (CVEs):** {cves}
- **Financial & Transaction Signatures:** {financials}

## 4. Entity Correlation & Relational Distribution
- **Organizations Detected:** {len(entities.get("organizations", []))} entities
- **Cyber IOCs (IPs/Domains):** {len(entities.get("ips", [])) + len(entities.get("domains", []))} endpoints
- **Jurisdictions / Locations:** {len(entities.get("locations", []))} locales

---
*Report generated automatically by AIDA RAG Engine. Verification against source documents recommended.*
"""
    return {
        "title": req.title,
        "classification": req.classification,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "markdown": report_markdown,
        "summary": {
            "documents_count": total_docs,
            "chunks_count": total_chunks,
            "threat_actor_count": len(entities.get("threat_actors", [])),
            "cve_count": len(entities.get("cves", [])),
        }
    }


# ── Mount Static Frontend from web/ directory ────────────────────────
web_path = Path(__file__).resolve().parent.parent / "web"
if not web_path.exists():
    web_path.mkdir(parents=True, exist_ok=True)

app.mount("/", StaticFiles(directory=str(web_path), html=True), name="web")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
