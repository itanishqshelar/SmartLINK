import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:8000",
});

// ── Documents ──────────────────────────────────────────────────────────────

/** List all documents in the vault */
export const listDocuments = () => api.get("/documents");

/** Get a single document's full metadata (summary, tags, etc.) */
export const getDocument = (docId) => api.get(`/document/${docId}`);

/** Upload a file and ingest it into the specified domain */
export const ingestDocument = (file, domain) => {
  const form = new FormData();
  form.append("file", file);
  form.append("domain", domain);
  return api.post("/ingest", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

/** Delete a document and all its chunks */
export const deleteDocument = (docId) => api.delete(`/document/${docId}`);

/** Get the download URL for the original uploaded file */
export const getDownloadUrl = (docId) =>
  `${api.defaults.baseURL}/document/${docId}/download`;

// ── AI ─────────────────────────────────────────────────────────────────────

/** Get available life-transition presets */
export const getTransitions = () => api.get("/transitions");

/**
 * Generate a cross-domain summary for a life transition.
 * @param {string} transition - transition preset ID or "custom"
 * @param {string} [customQuery] - optional extra context
 */
export const queryTransition = (transition, customQuery) =>
  api.post("/query", { transition, custom_query: customQuery ?? undefined });

/**
 * Ask a free-form question grounded in the user's documents.
 * @param {string} question
 * @param {string[]|null} domains - null = search all domains
 */
export const askAI = (question, domains = null) =>
  api.post("/ask", { question, domains });

/**
 * Semantic search across document chunks.
 * @param {string} query
 * @param {string[]|null} domains - null = search all domains
 * @param {number} limit
 */
export const searchDocuments = (query, domains = null, limit = 10) =>
  api.post("/search", { query, domains, limit });

/**
 * Run a deep AI analysis on a single document.
 * @param {string} docId
 */
export const analyzeDocument = (docId) => api.get(`/document/${docId}/analyze`);

// ── System ─────────────────────────────────────────────────────────────────

/** Health check — returns AI config status + counts */
export const healthCheck = () => api.get("/health");
