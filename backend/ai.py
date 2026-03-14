import json
import os
import re
from typing import List

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# ── Configuration ─────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("[ai.py] WARNING: GEMINI_API_KEY not set. AI features will fail.")

GEMINI_MODEL = "gemini-2.5-flash"
EMBED_MODEL = "models/text-embedding-004"

# Safety: keep token budget reasonable
MAX_CONTEXT_CHARS = 28_000  # ~7k tokens — plenty for Flash
MAX_CHUNK_CHARS = 8_000  # per-chunk embedding input limit
MAX_TAG_CHARS = 3_000  # for tag / summary generation


# ── Low-level helpers ─────────────────────────────────────────────────────────


def _model() -> genai.GenerativeModel:
    """Return a configured GenerativeModel instance."""
    return genai.GenerativeModel(GEMINI_MODEL)


def _clean_json_fence(text: str) -> str:
    """Strip markdown code fences that the model sometimes wraps around JSON."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _build_context_block(chunks: List[dict], max_chunks: int = 20) -> str:
    """Format a list of chunk dicts into a readable context block."""
    parts: List[str] = []
    total = 0
    for chunk in chunks[:max_chunks]:
        header = f"[{chunk.get('domain', '?').upper()} — {chunk.get('filename', '?')}]"
        body = chunk.get("text", "").strip()
        segment = f"{header}\n{body}"
        if total + len(segment) > MAX_CONTEXT_CHARS:
            break
        parts.append(segment)
        total += len(segment)
    return "\n\n---\n\n".join(parts)


# ── Embeddings ────────────────────────────────────────────────────────────────


def get_embedding(text: str) -> List[float]:
    """
    Generate a document embedding vector using text-embedding-004.
    Used at ingest time to index each chunk.
    """
    result = genai.embed_content(
        model=EMBED_MODEL,
        content=text[:MAX_CHUNK_CHARS],
        task_type="retrieval_document",
    )
    return result["embedding"]


def get_query_embedding(text: str) -> List[float]:
    """
    Generate a query embedding vector using text-embedding-004.
    Used at retrieval time to find relevant chunks.
    """
    result = genai.embed_content(
        model=EMBED_MODEL,
        content=text,
        task_type="retrieval_query",
    )
    return result["embedding"]


# ── Per-document AI (called at ingest) ───────────────────────────────────────


def generate_document_summary(text: str) -> str:
    """
    Return a concise 2–4 sentence summary of a single document.
    Called once per document during ingestion.
    """
    prompt = f"""You are an AI assistant embedded in ContextBridge, a personal \
document intelligence platform.

Summarize the following document in 2–4 sentences. Be factual and specific — \
mention key names, dates, amounts, or identifiers where present. \
Do NOT start with "This document…" or "The document…".

Document content:
\"\"\"
{text[:MAX_TAG_CHARS]}
\"\"\"

Summary (2–4 sentences):"""

    response = _model().generate_content(prompt)
    return response.text.strip()


def generate_document_tags(text: str) -> List[str]:
    """
    Return 3–6 lowercase keyword tags for a document.
    Returns a plain Python list of strings.
    """
    prompt = f"""You are an AI assistant embedded in ContextBridge, a personal \
document intelligence platform.

Extract 3–6 concise, lowercase keyword tags from the document below.
Return ONLY a valid JSON array of strings — no explanation, no markdown fences.
Example output: ["tax return", "2023", "income", "federal"]

Document content:
\"\"\"
{text[:MAX_TAG_CHARS]}
\"\"\"

JSON array of tags:"""

    response = _model().generate_content(prompt)
    raw = _clean_json_fence(response.text)

    try:
        tags = json.loads(raw)
        if isinstance(tags, list):
            return [str(t).lower().strip() for t in tags[:6] if t]
    except (json.JSONDecodeError, ValueError):
        pass

    # Graceful fallback: split on commas if the model returned plain text
    fallback = re.sub(r'[\[\]"\']', "", raw)
    return [t.strip().lower() for t in fallback.split(",") if t.strip()][:6]


# ── Cross-document AI (called at query time) ─────────────────────────────────


def generate_summary(
    chunks: List[dict], transition_label: str = "Complete Overview"
) -> str:
    """
    Generate a cross-domain intelligence summary from multiple document chunks.
    Used by the /query endpoint (Transitions + Dashboard).
    """
    if not chunks:
        return (
            "No documents found in your vault. "
            "Upload documents to your Vault to generate AI-powered summaries."
        )

    context = _build_context_block(chunks)

    prompt = f"""You are an intelligent AI assistant for ContextBridge. \
You synthesise a user's personal documents \
into clear, actionable intelligence.

You are producing a **"{transition_label}"** context summary.

── Document excerpts ──────────────────────────────────────────────────────────
{context}
───────────────────────────────────────────────────────────────────────────────

Write a well-organised summary that:
1. Opens with a 2–3 sentence executive overview relevant to "{transition_label}".
2. Uses domain headings (## Education, ## Health, ## Finance, ## Identity) \
   only for domains that have content.
3. Under each heading uses bullet points to call out key facts, dates, \
   figures, names, and document references.
4. Closes with a short "Gaps & Recommendations" section that notes any \
   obviously missing documents or actions the user should consider.

Be specific, concise, and professional. Do not invent information not present \
in the excerpts."""

    response = _model().generate_content(prompt)
    return response.text


def answer_question(question: str, chunks: List[dict]) -> str:
    """
    Answer a free-form question grounded in the user's document chunks.
    Used by the /ask endpoint (AI Assistant page).
    """
    if not chunks:
        return (
            "I couldn't find any relevant document context to answer your question. "
            "Try uploading documents related to your query, or broaden the domain filter."
        )

    context = _build_context_block(chunks, max_chunks=15)

    prompt = f"""You are an intelligent AI assistant for ContextBridge. \
You answer questions about a user's \
personal documents with precision and honesty.

Rules:
- Answer ONLY from the provided document context.
- If the answer is not present, say: "I couldn't find that information in your uploaded documents."
- Cite the source document filename and domain in parentheses when quoting a specific fact, \
  e.g. (Finance — bank_statement.pdf).
- Be concise. Use bullet points for multi-part answers.

── User question ──────────────────────────────────────────────────────────────
{question}
───────────────────────────────────────────────────────────────────────────────

── Document context ───────────────────────────────────────────────────────────
{context}
───────────────────────────────────────────────────────────────────────────────

Answer:"""

    response = _model().generate_content(prompt)
    return response.text


def analyze_document(text: str, filename: str, domain: str) -> str:
    """
    Deep AI analysis of a single document — key facts, anomalies, action items.
    Can be called on-demand from a future /analyze/{doc_id} endpoint.
    """
    prompt = f"""You are an intelligent AI assistant for ContextBridge. \
Perform a thorough analysis of the following \
{domain.upper()} document: "{filename}".

Your analysis should include:
1. **Document Type** — What kind of document is this?
2. **Key Facts** — Important names, dates, figures, identifiers.
3. **Notable Items** — Anything unusual, important deadlines, or action items.
4. **Suggested Actions** — What should the user do with or because of this document?

Document content:
\"\"\"
{text[:MAX_CONTEXT_CHARS]}
\"\"\"

Analysis:"""

    response = _model().generate_content(prompt)
    return response.text
