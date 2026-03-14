"""
main.py — ContextBridge Backend
================================
FastAPI application exposing all REST endpoints consumed by the React frontend.

Endpoints
---------
  GET  /documents                   List all ingested documents
  GET  /document/{doc_id}           Get a single document (with summary + tags)
  POST /ingest                      Upload + process a new document
  DELETE /document/{doc_id}         Remove a document and all its chunks
  GET  /transitions                 List available life-transition presets
  POST /query                       Generate a transition / cross-domain summary
  POST /ask                         AI Q&A grounded in the user's documents
  POST /search                      Semantic search across chunks
  GET  /document/{doc_id}/download  Download the original uploaded file
  GET  /document/{doc_id}/analyze   Deep AI analysis of a single document
  GET  /health                      Health-check + config status
"""

from __future__ import annotations

import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

from ai import analyze_document, answer_question, generate_summary
from database import Chunk, Document, engine, init_db
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from ingestion import process_document
from models import AskRequest, QueryRequest, SearchRequest
from retrieval import (
    get_document_chunks,
    retrieve_chunks_for_transition,
    semantic_search_with_scores,
)
from sqlmodel import Session, col, select

load_dotenv()

# ── Paths & constants ─────────────────────────────────────────────────────────

UPLOADS_DIR = Path(__file__).parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

ALLOWED_DOMAINS = {"education", "health", "finance", "identity"}
ALL_DOMAINS = list(ALLOWED_DOMAINS)

# ── Life-transition presets ───────────────────────────────────────────────────

TRANSITIONS: list[dict] = [
    {
        "id": "job_change",
        "label": "Job Change",
        "icon": "briefcase",
        "domains": ["education", "identity", "finance"],
        "description": (
            "Prepare your credentials, financial history, and identity "
            "documents for a new job or career switch."
        ),
    },
    {
        "id": "medical_event",
        "label": "Medical Event",
        "icon": "stethoscope",
        "domains": ["health", "identity"],
        "description": (
            "Compile your medical records, prescriptions, and identity "
            "documents for a healthcare appointment or emergency."
        ),
    },
    {
        "id": "financial_planning",
        "label": "Financial Planning",
        "icon": "bank",
        "domains": ["finance", "education"],
        "description": (
            "Review financial statements, tax records, and education "
            "credentials to plan your financial future."
        ),
    },
    {
        "id": "relocation",
        "label": "Relocation",
        "icon": "map-pin",
        "domains": ["identity", "finance", "education"],
        "description": (
            "Gather identity, financial, and educational documents needed "
            "for moving to a new city or country."
        ),
    },
    {
        "id": "custom",
        "label": "Complete Overview",
        "icon": "sliders",
        "domains": ["education", "health", "finance", "identity"],
        "description": (
            "Full cross-domain intelligence summary across all your "
            "uploaded documents."
        ),
    },
]

# Build a quick lookup map
_TRANSITION_BY_ID: dict[str, dict] = {t["id"]: t for t in TRANSITIONS}


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: D401
    """Initialise the SQLite database on startup."""
    init_db()
    print("[startup] ContextBridge backend ready.")
    yield
    print("[shutdown] ContextBridge backend stopped.")


# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="ContextBridge API",
    description="Intelligent document bridge with AI-powered analysis and search.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the Vite dev server and any configured origins
_raw_origins = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000"
)
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Serialisation helpers ─────────────────────────────────────────────────────


def _doc_to_dict(doc: Document) -> dict:
    """Convert a Document ORM object to a JSON-serialisable dict."""
    tags: list[str] = []
    if doc.tags:
        try:
            parsed = json.loads(doc.tags)
            if isinstance(parsed, list):
                tags = parsed
        except (json.JSONDecodeError, ValueError):
            pass

    return {
        "doc_id": doc.doc_id,
        "filename": doc.filename,
        "domain": doc.domain,
        "file_type": doc.file_type,
        "ocr_method": doc.ocr_method,
        "created_at": doc.created_at,
        "chunk_count": doc.chunk_count,
        "summary": doc.summary,
        "tags": tags,
    }


def _chunk_to_dict(chunk: Chunk) -> dict:
    """Convert a Chunk ORM object to a JSON-serialisable dict."""
    return {
        "chunk_id": chunk.chunk_id,
        "doc_id": chunk.doc_id,
        "domain": chunk.domain,
        "filename": chunk.filename,
        "text": chunk.text,
        "chunk_index": chunk.chunk_index,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────


# ── Health check ──────────────────────────────────────────────────────────────


@app.get("/health", tags=["System"])
def health_check():
    """
    Returns the operational status and key configuration flags.
    Useful for the frontend to detect misconfiguration early.
    """
    gemini_ok = bool(os.getenv("GEMINI_API_KEY"))

    with Session(engine) as session:
        doc_count = len(session.exec(select(Document)).all())
        chunk_count = len(session.exec(select(Chunk)).all())

    return {
        "status": "ok",
        "gemini_configured": gemini_ok,
        "document_count": doc_count,
        "chunk_count": chunk_count,
    }


# ── Document listing & detail ─────────────────────────────────────────────────


@app.get("/documents", tags=["Documents"])
def list_documents():
    """Return all documents in the vault, sorted newest first."""
    with Session(engine) as session:
        docs = session.exec(select(Document)).all()
    # Sort by created_at descending (ISO string sort works for UTC timestamps)
    sorted_docs = sorted(docs, key=lambda d: d.created_at, reverse=True)
    return [_doc_to_dict(d) for d in sorted_docs]


@app.get("/document/{doc_id}", tags=["Documents"])
def get_document(doc_id: str):
    """Return full metadata for a single document."""
    with Session(engine) as session:
        doc = session.get(Document, doc_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found.")
    return _doc_to_dict(doc)


# ── Ingest ────────────────────────────────────────────────────────────────────


@app.post("/ingest", tags=["Documents"])
async def ingest(
    file: UploadFile = File(...),
    domain: str = Form(...),
):
    """
    Upload a file and run the full ingestion pipeline:
      OCR → Chunking → Embedding → AI Summary + Tags → Database
    """
    if domain not in ALLOWED_DOMAINS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid domain '{domain}'. Must be one of: {sorted(ALLOWED_DOMAINS)}",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        doc = process_document(
            file_bytes=file_bytes,
            filename=file.filename or "untitled",
            domain=domain,
            uploads_dir=UPLOADS_DIR,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Ingestion failed: {exc}",
        ) from exc

    return _doc_to_dict(doc)


# ── Delete ────────────────────────────────────────────────────────────────────


@app.delete("/document/{doc_id}", tags=["Documents"])
def delete_document(doc_id: str):
    """
    Remove a document and all its chunks from the database.
    Also deletes the original file from disk if it exists.
    """
    with Session(engine) as session:
        doc = session.get(Document, doc_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found.")

        # Delete file from disk
        file_path = UPLOADS_DIR / doc_id / doc.filename
        if file_path.exists():
            try:
                file_path.unlink()
            except OSError as exc:
                print(f"[delete] Could not remove file {file_path}: {exc}")

        parent_dir = UPLOADS_DIR / doc_id
        if parent_dir.exists():
            try:
                parent_dir.rmdir()
            except OSError:
                pass  # directory not empty — leave it

        # Delete all associated chunks
        chunks = session.exec(select(Chunk).where(col(Chunk.doc_id) == doc_id)).all()
        for chunk in chunks:
            session.delete(chunk)

        session.delete(doc)
        session.commit()

    return {"status": "deleted", "doc_id": doc_id}


# ── Download original file ────────────────────────────────────────────────────


@app.get("/document/{doc_id}/download", tags=["Documents"])
def download_document(doc_id: str):
    """Serve the original uploaded file as a file download."""
    with Session(engine) as session:
        doc = session.get(Document, doc_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found.")
        filename = doc.filename

    file_path = UPLOADS_DIR / doc_id / filename
    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Original file not found on disk. It may have been deleted.",
        )

    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="application/octet-stream",
    )


# ── Deep AI analysis ──────────────────────────────────────────────────────────


@app.get("/document/{doc_id}/analyze", tags=["AI"])
def analyze_doc(doc_id: str):
    """
    Run a deep Gemini-powered analysis on a single document:
    document type, key facts, notable items, suggested actions.
    """
    with Session(engine) as session:
        doc = session.get(Document, doc_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found.")

        # Reconstruct the document text from its stored chunks
        chunks = get_document_chunks(session, doc_id)

    if not chunks:
        raise HTTPException(
            status_code=422,
            detail="No text chunks found for this document. Re-ingest the file.",
        )

    full_text = "\n\n".join(c.text for c in chunks)

    try:
        analysis = analyze_document(full_text, doc.filename, doc.domain)
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"AI analysis failed: {exc}"
        ) from exc

    return {
        "doc_id": doc_id,
        "filename": doc.filename,
        "domain": doc.domain,
        "analysis": analysis,
    }


# ── Transitions ───────────────────────────────────────────────────────────────


@app.get("/transitions", tags=["AI"])
def get_transitions():
    """Return the list of life-transition presets shown on the Transitions page."""
    return TRANSITIONS


# ── Transition / cross-domain query ──────────────────────────────────────────


@app.post("/query", tags=["AI"])
def query_transition(request: QueryRequest):
    """
    Generate a cross-domain intelligence summary for a life transition.

    Steps
    -----
    1. Look up the transition preset (falls back to 'Complete Overview').
    2. Retrieve the most relevant chunks from the transition's domains.
    3. Generate a structured narrative summary via AI.
    """
    transition = _TRANSITION_BY_ID.get(request.transition)
    if not transition:
        # Fallback to complete overview
        transition = _TRANSITION_BY_ID["custom"]

    domains: list[str] = transition["domains"]
    label: str = transition["label"]

    with Session(engine) as session:
        chunks = retrieve_chunks_for_transition(
            session, domains=domains, label=label, limit=20
        )

    chunk_dicts = [_chunk_to_dict(c) for c in chunks]

    try:
        summary = generate_summary(chunk_dicts, label)
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"AI summary generation failed: {exc}"
        ) from exc

    return {"summary": summary, "chunks_used": chunk_dicts}


# ── AI Q&A (Ask) ──────────────────────────────────────────────────────────────


@app.post("/ask", tags=["AI"])
def ask_question(request: AskRequest):
    """
    Answer a free-form question grounded in the user's documents.

    Uses semantic search to find the most relevant chunks, then passes them
    as context to the AI model along with the user's question.
    """
    domains = request.domains if request.domains else ALL_DOMAINS

    with Session(engine) as session:
        results = semantic_search_with_scores(
            session, query=request.question, domains=domains, limit=10
        )

    chunk_dicts = [_chunk_to_dict(chunk) for chunk, _ in results]

    try:
        answer = answer_question(request.question, chunk_dicts)
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"AI Q&A failed: {exc}"
        ) from exc

    return {"answer": answer, "chunks_used": chunk_dicts}


# ── Semantic search ───────────────────────────────────────────────────────────


@app.post("/search", tags=["AI"])
def search_documents(request: SearchRequest):
    """
    Semantic search across all document chunks.

    Returns a ranked list of results, each with the matching chunk and its
    relevance score (0–1, higher is more relevant).
    """
    domains = request.domains if request.domains else ALL_DOMAINS
    limit = max(1, min(request.limit, 50))  # clamp to [1, 50]

    with Session(engine) as session:
        scored = semantic_search_with_scores(
            session, query=request.query, domains=domains, limit=limit
        )

    return {
        "query": request.query,
        "results": [
            {"chunk": _chunk_to_dict(chunk), "score": round(score, 4)}
            for chunk, score in scored
        ],
    }


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=True)
