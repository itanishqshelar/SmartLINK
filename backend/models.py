from pydantic import BaseModel
from typing import Optional, List


class DocumentOut(BaseModel):
    doc_id: str
    filename: str
    domain: str
    file_type: str
    ocr_method: str
    created_at: str
    chunk_count: int
    summary: Optional[str] = None
    tags: List[str] = []


class ChunkOut(BaseModel):
    chunk_id: str
    doc_id: str
    domain: str
    filename: str
    text: str
    chunk_index: int


class QueryRequest(BaseModel):
    transition: str
    custom_query: Optional[str] = None


class QueryResponse(BaseModel):
    summary: str
    chunks_used: List[ChunkOut]


class AskRequest(BaseModel):
    question: str
    domains: Optional[List[str]] = None


class AskResponse(BaseModel):
    answer: str
    chunks_used: List[ChunkOut]


class SearchRequest(BaseModel):
    query: str
    domains: Optional[List[str]] = None
    limit: int = 10


class SearchResultItem(BaseModel):
    chunk: ChunkOut
    score: float


class SearchResponse(BaseModel):
    results: List[SearchResultItem]
