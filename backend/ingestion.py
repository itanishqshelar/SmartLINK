"""
ingestion.py — Document processing pipeline for ContextBridge
=============================================================
Pipeline stages:
  1.  Extract text          (ocr.py)
  2.  Chunk text            (overlapping fixed-size windows)
  3.  Generate embeddings   (ai.py → text-embedding-004)
  4.  Generate AI metadata  (ai.py)
  5.  Persist to disk       (uploads/<doc_id>/<filename>)
  6.  Persist to database   (Document + Chunk rows)
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Tuple

from ai import (
    generate_document_summary,
    generate_document_tags,
    get_embedding,
)
from database import Chunk, Document, engine
from ocr import extract_text
from sqlmodel import Session

# ── Chunking configuration ────────────────────────────────────────────────────

CHUNK_SIZE = 1_500  # characters per chunk
CHUNK_OVERLAP = 200  # characters shared between consecutive chunks
MIN_CHUNK_CHARS = 40  # discard chunks shorter than this


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────


def _chunk_text(text: str) -> List[str]:
    """
    Split *text* into overlapping windows of CHUNK_SIZE characters.

    The last window may be shorter than CHUNK_SIZE.
    Windows whose stripped length is below MIN_CHUNK_CHARS are discarded.
    """
    if not text.strip():
        return []

    chunks: List[str] = []
    start = 0
    length = len(text)

    while start < length:
        end = min(start + CHUNK_SIZE, length)
        window = text[start:end].strip()

        if len(window) >= MIN_CHUNK_CHARS:
            chunks.append(window)

        if end >= length:
            break

        # Advance with overlap so consecutive chunks share context
        start = end - CHUNK_OVERLAP

    return chunks


def _embed_chunks(chunks: List[str]) -> List[str | None]:
    """
    Return a parallel list of JSON-encoded embedding strings (or None on error).

    Each call to get_embedding() hits the Gemini text-embedding-004 API.
    Failures are caught per-chunk so a single API error does not abort the
    entire ingestion.
    """
    results: List[str | None] = []

    for idx, chunk_text in enumerate(chunks):
        try:
            vector = get_embedding(chunk_text)
            results.append(json.dumps(vector))
        except Exception as exc:  # noqa: BLE001
            print(f"[ingestion] Embedding failed for chunk {idx}: {exc}")
            results.append(None)

    return results


def _save_file(
    file_bytes: bytes,
    filename: str,
    doc_id: str,
    uploads_dir: Path,
) -> Path:
    """
    Persist the original uploaded file to:
        <uploads_dir>/<doc_id>/<filename>

    Returns the path to the saved file.
    """
    doc_dir = uploads_dir / doc_id
    doc_dir.mkdir(parents=True, exist_ok=True)
    dest = doc_dir / filename
    dest.write_bytes(file_bytes)
    return dest


def _generate_ai_metadata(text: str) -> Tuple[str | None, List[str]]:
    """
    Call Gemini to produce a short document summary and keyword tags.

    Both calls are independently guarded — a failure in one does not
    prevent the other from succeeding, and neither failure aborts ingestion.
    """
    summary: str | None = None
    tags: List[str] = []

    try:
        summary = generate_document_summary(text)
    except Exception as exc:  # noqa: BLE001
        print(f"[ingestion] AI summary generation failed: {exc}")

    try:
        tags = generate_document_tags(text)
    except Exception as exc:  # noqa: BLE001
        print(f"[ingestion] AI tag generation failed: {exc}")

    return summary, tags


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────


def process_document(
    file_bytes: bytes,
    filename: str,
    domain: str,
    uploads_dir: Path,
) -> Document:
    """
    Full ingestion pipeline for a single uploaded document.

    Parameters
    ----------
    file_bytes   : Raw bytes of the uploaded file.
    filename     : Original filename (used to determine extraction strategy).
    domain       : One of: education | health | finance | identity
    uploads_dir  : Root directory under which files are stored on disk.

    Returns
    -------
    Document     : The persisted Document ORM object (freshly committed).

    Raises
    ------
    ValueError   : If no text could be extracted from the file.
    Exception    : Propagated from the database layer on write failure.
    """

    # ── Stage 1 · Extract text ────────────────────────────────────────────────
    print(f"[ingestion] Extracting text from '{filename}' (domain={domain})…")
    raw_text, ocr_method = extract_text(file_bytes, filename)

    if not raw_text.strip():
        raise ValueError(
            f"Could not extract any text from '{filename}'. "
            "The file may be empty, password-protected, or in an unsupported format."
        )

    print(
        f"[ingestion] Extracted {len(raw_text):,} characters via method='{ocr_method}'."
    )

    # ── Stage 2 · Chunk text ──────────────────────────────────────────────────
    chunks_text = _chunk_text(raw_text)
    print(f"[ingestion] Created {len(chunks_text)} chunks.")

    if not chunks_text:
        raise ValueError(
            f"Text was extracted but could not be chunked for '{filename}'. "
            "The document may contain only whitespace or non-textual content."
        )

    # ── Stage 3 · Generate embeddings ────────────────────────────────────────
    print("[ingestion] Generating chunk embeddings via text-embedding-004…")
    embeddings = _embed_chunks(chunks_text)
    embedded_count = sum(1 for e in embeddings if e is not None)
    print(f"[ingestion] Embedded {embedded_count}/{len(chunks_text)} chunks.")

    # ── Stage 4 · AI metadata (summary + tags) ───────────────────────────────
    print("[ingestion] Generating AI summary and tags…")
    # Feed up to 4 000 characters to keep the AI calls fast and cheap
    metadata_text = raw_text[:4_000]
    doc_summary, doc_tags = _generate_ai_metadata(metadata_text)

    if doc_summary:
        print(f"[ingestion] Summary: {doc_summary[:80]}…")
    if doc_tags:
        print(f"[ingestion] Tags: {doc_tags}")

    # ── Stage 5 · Save original file to disk ─────────────────────────────────
    doc_id = str(uuid.uuid4())
    file_type = Path(filename).suffix.lower().lstrip(".") or "bin"

    saved_path = _save_file(file_bytes, filename, doc_id, uploads_dir)
    print(f"[ingestion] Saved original file to: {saved_path}")

    # ── Stage 6 · Build ORM objects ───────────────────────────────────────────
    document = Document(
        doc_id=doc_id,
        filename=filename,
        domain=domain,
        file_type=file_type,
        ocr_method=ocr_method,
        created_at=datetime.utcnow().isoformat(),
        chunk_count=len(chunks_text),
        summary=doc_summary,
        tags=json.dumps(doc_tags) if doc_tags else "[]",
    )

    chunk_records: List[Chunk] = []
    for idx, (chunk_text_str, embedding_json) in enumerate(
        zip(chunks_text, embeddings)
    ):
        chunk_records.append(
            Chunk(
                chunk_id=str(uuid.uuid4()),
                doc_id=doc_id,
                domain=domain,
                filename=filename,
                text=chunk_text_str,
                chunk_index=idx,
                embedding=embedding_json,
            )
        )

    # ── Stage 7 · Persist to database ────────────────────────────────────────
    with Session(engine) as session:
        session.add(document)
        for chunk in chunk_records:
            session.add(chunk)
        session.commit()
        session.refresh(document)

    print(
        f"[ingestion] Document '{filename}' (id={doc_id}) "
        f"committed with {len(chunk_records)} chunks."
    )

    return document
