"""
retrieval.py — Chunk retrieval engine for ContextBridge
========================================================
Two retrieval modes:

  1. retrieve_chunks_for_transition(session, domains, label, limit)
       Domain-filtered retrieval used by the /query (Transitions) endpoint.
       If embeddings exist it uses semantic re-ranking against the transition
       label; otherwise it returns an even spread of chunks per domain.

  2. semantic_search_chunks(session, query, domains, limit)
       Full semantic search used by the /ask (AI Assistant) endpoint.
       Falls back to keyword-overlap scoring when embeddings are absent.

  3. semantic_search_with_scores(session, query, domains, limit)
       Same as above but returns (Chunk, float) tuples for the /search endpoint.
"""

from __future__ import annotations

import json
from typing import List, Tuple

import numpy as np
from database import Chunk
from sqlmodel import Session, col, select

# ── Similarity helpers ────────────────────────────────────────────────────────


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    """Return cosine similarity in [−1, 1] between two equal-length vectors."""
    va = np.asarray(a, dtype=np.float32)
    vb = np.asarray(b, dtype=np.float32)
    norm_a = float(np.linalg.norm(va))
    norm_b = float(np.linalg.norm(vb))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return float(np.dot(va, vb) / (norm_a * norm_b))


def _keyword_score(query: str, text: str) -> float:
    """
    Lightweight fallback scorer when embeddings are unavailable.
    Returns the fraction of unique query words that appear in the chunk text.
    """
    query_words = set(query.lower().split())
    text_lower = text.lower()
    if not query_words:
        return 0.0
    hits = sum(1 for w in query_words if w in text_lower)
    return hits / len(query_words)


def _load_embedding(chunk: Chunk) -> List[float] | None:
    """
    Deserialise a chunk's stored JSON embedding.
    Returns None if the field is absent or malformed.
    """
    if not chunk.embedding:
        return None
    try:
        emb = json.loads(chunk.embedding)
        if isinstance(emb, list) and len(emb) > 0:
            return emb
    except (json.JSONDecodeError, ValueError):
        pass
    return None


# ── Internal query-embedding helper (lazy import avoids circular deps) ────────


def _embed_query(text: str) -> List[float] | None:
    """
    Return a query embedding vector from Gemini text-embedding-004.
    Returns None gracefully if the API call fails (network, quota, key errors).
    """
    try:
        from ai import get_query_embedding  # local import to avoid circular

        return get_query_embedding(text)
    except Exception as exc:  # noqa: BLE001
        print(f"[retrieval] Embedding query failed, using keyword fallback: {exc}")
        return None


# ── Domain-aware chunk fetching ───────────────────────────────────────────────


def _fetch_chunks_for_domains(session: Session, domains: List[str]) -> List[Chunk]:
    """Return ALL chunks that belong to any of the requested domains."""
    if not domains:
        return []
    statement = select(Chunk).where(col(Chunk.domain).in_(domains))
    return list(session.exec(statement).all())


def _even_domain_sample(
    session: Session, domains: List[str], limit: int
) -> List[Chunk]:
    """
    Return up to `limit` chunks spread evenly across `domains`.
    Used when no query is available for semantic ranking.
    """
    if not domains:
        return []
    per_domain = max(1, limit // len(domains))
    results: List[Chunk] = []
    for domain in domains:
        stmt = select(Chunk).where(col(Chunk.domain) == domain).limit(per_domain)
        results.extend(session.exec(stmt).all())
    return results[:limit]


# ── Scoring pipeline ──────────────────────────────────────────────────────────


def _score_and_rank(
    chunks: List[Chunk],
    query: str,
    query_embedding: List[float] | None,
    limit: int,
) -> List[Tuple[Chunk, float]]:
    """
    Score every chunk against the query and return top-`limit` results.

    Scoring strategy
    ----------------
    • If a chunk has an embedding AND a query embedding is available:
        → cosine similarity  (range −1 … 1, normalised to 0 … 1 for display)
    • Otherwise:
        → keyword overlap score  (range 0 … 1)
    """
    scored: List[Tuple[Chunk, float]] = []

    for chunk in chunks:
        chunk_emb = _load_embedding(chunk)

        if query_embedding is not None and chunk_emb is not None:
            raw_cos = _cosine_similarity(query_embedding, chunk_emb)
            # Normalise −1…1 → 0…1
            score = (raw_cos + 1.0) / 2.0
        else:
            score = _keyword_score(query, chunk.text)

        scored.append((chunk, score))

    # Sort descending by score
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:limit]


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────


def retrieve_chunks_for_transition(
    session: Session,
    domains: List[str],
    label: str = "Complete Overview",
    limit: int = 20,
) -> List[Chunk]:
    """
    Retrieve the most relevant chunks for a life-transition query.

    Steps
    -----
    1. Fetch all chunks in the specified domains.
    2. Embed the transition label as a semantic query.
    3. Score + rank all chunks (semantic or keyword fallback).
    4. Return top-`limit` chunks.

    Parameters
    ----------
    session : SQLModel Session
    domains : list of domain strings  e.g. ["education", "finance"]
    label   : human-readable transition name used as the semantic query
    limit   : maximum number of chunks to return
    """
    all_chunks = _fetch_chunks_for_domains(session, domains)

    if not all_chunks:
        return []

    # Check whether any chunks have embeddings
    has_embeddings = any(c.embedding for c in all_chunks)

    if has_embeddings:
        query_emb = _embed_query(label)
    else:
        query_emb = None

    ranked = _score_and_rank(all_chunks, label, query_emb, limit)
    return [chunk for chunk, _ in ranked]


def semantic_search_chunks(
    session: Session,
    query: str,
    domains: List[str],
    limit: int = 10,
) -> List[Chunk]:
    """
    Semantic search over the user's document chunks.

    Returns the top-`limit` chunks most relevant to `query` across the
    specified domains, using Gemini embeddings when available or keyword
    overlap scoring as a fallback.

    Parameters
    ----------
    session : SQLModel Session
    query   : free-form natural language question / search string
    domains : domains to search within; pass all four for a global search
    limit   : maximum number of results
    """
    results = semantic_search_with_scores(session, query, domains, limit)
    return [chunk for chunk, _ in results]


def semantic_search_with_scores(
    session: Session,
    query: str,
    domains: List[str],
    limit: int = 10,
) -> List[Tuple[Chunk, float]]:
    """
    Semantic search that also returns relevance scores.

    Returns
    -------
    List of (Chunk, score) tuples sorted by score descending.
    score is in the range [0, 1]:
      • 1.0 = perfect semantic match (or keyword: all words found)
      • 0.0 = no overlap at all
    """
    if not domains:
        domains = ["education", "health", "finance", "identity"]

    all_chunks = _fetch_chunks_for_domains(session, domains)

    if not all_chunks:
        return []

    has_embeddings = any(c.embedding for c in all_chunks)
    query_emb = _embed_query(query) if has_embeddings else None

    return _score_and_rank(all_chunks, query, query_emb, limit)


def get_document_chunks(session: Session, doc_id: str) -> List[Chunk]:
    """Return all chunks for a specific document, ordered by chunk index."""
    statement = (
        select(Chunk).where(col(Chunk.doc_id) == doc_id).order_by(Chunk.chunk_index)  # type: ignore[arg-type]
    )
    return list(session.exec(statement).all())
