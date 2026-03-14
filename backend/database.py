import uuid
from datetime import datetime
from typing import Optional
from pathlib import Path

from sqlmodel import SQLModel, Field, create_engine

# ── Storage paths ────────────────────────────────────────────────────────────
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_URL = f"sqlite:///{DATA_DIR / 'contextbridge.db'}"
engine = create_engine(DATABASE_URL, echo=False)


# ── Table: Document ───────────────────────────────────────────────────────────
class Document(SQLModel, table=True):
    """
    One row per uploaded file.
    - summary  : short AI-generated overview (nullable until generated)
    - tags     : JSON-encoded list of keyword strings  e.g. '["tax","2023"]'
    """

    doc_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
    )
    filename: str
    domain: str                          # education | health | finance | identity
    file_type: str                       # pdf | jpg | docx | txt …
    ocr_method: str = "native"           # native | vision | text | failed
    created_at: str = Field(
        default_factory=lambda: datetime.utcnow().isoformat()
    )
    chunk_count: int = 0
    summary: Optional[str] = None
    tags: Optional[str] = None           # JSON list stored as plain string


# ── Table: Chunk ──────────────────────────────────────────────────────────────
class Chunk(SQLModel, table=True):
    """
    One row per text chunk extracted from a Document.
    - embedding : JSON-encoded list[float] from text-embedding-004 (nullable)
    """

    chunk_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
    )
    doc_id: str = Field(index=True)      # FK → Document.doc_id  (soft reference)
    domain: str
    filename: str
    text: str
    chunk_index: int
    embedding: Optional[str] = None      # JSON list[float], 768-dim


# ── Helpers ───────────────────────────────────────────────────────────────────
def init_db() -> None:
    """Create all tables (idempotent — safe to call on every startup)."""
    SQLModel.metadata.create_all(engine)
