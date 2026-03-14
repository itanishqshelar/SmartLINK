import { useEffect, useMemo, useState } from "react";
import { BookOpen, CreditCard, HeartPulse, IdCard, FileText, Download, Trash2, Search, Loader2 } from "lucide-react";
import DomainCard from "../components/DomainCard";
import { api, getBulkDownloadUrl, getDownloadUrl, searchDocuments } from "../api";
import { useToast } from "../context/ToastContext";

const domains = [
  { id: "education", icon: <BookOpen size={16} className="text-[#3B82F6]" /> },
  { id: "health", icon: <HeartPulse size={16} className="text-[#10B981]" /> },
  { id: "finance", icon: <CreditCard size={16} className="text-[#F59E0B]" /> },
  { id: "identity", icon: <IdCard size={16} className="text-[#8B5CF6]" /> },
];

export default function Vault() {
  const { pushToast } = useToast();
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [statusByDomain, setStatusByDomain] = useState({});
  const [errorByDomain, setErrorByDomain] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const fetchDocuments = async () => {
    try {
      const response = await api.get("/documents");
      setDocuments(response.data || []);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchDocuments().catch(() => pushToast("error", "Could not load vault documents"));
  }, []);

  const grouped = useMemo(() => {
    const map = {
      education: [],
      health: [],
      finance: [],
      identity: [],
    };
    documents.forEach((doc) => {
      if (map[doc.domain]) {
        map[doc.domain].push(doc);
      }
    });
    return map;
  }, [documents]);

  const uploadForDomain = async (domain, file) => {
    setStatusByDomain((prev) => ({ ...prev, [domain]: "processing" }));
    setErrorByDomain((prev) => ({ ...prev, [domain]: "" }));
    pushToast("processing", `Processing ${file.name} locally...`);

    const form = new FormData();
    form.append("file", file);
    form.append("domain", domain);

    try {
      await api.post("/ingest", form, { headers: { "Content-Type": "multipart/form-data" } });
      await fetchDocuments();
      setStatusByDomain((prev) => ({ ...prev, [domain]: "complete" }));
      pushToast("success", `${file.name} ingested successfully`);
    } catch (error) {
      const message = error?.response?.data?.detail || "Upload/OCR failed";
      setStatusByDomain((prev) => ({ ...prev, [domain]: "failed" }));
      setErrorByDomain((prev) => ({ ...prev, [domain]: message }));
      pushToast("error", message);
    }
  };

  const removeDocument = async (docId) => {
    try {
      await api.delete(`/document/${docId}`);
      await fetchDocuments();
      pushToast("success", "Document removed");
    } catch {
      pushToast("error", "Could not remove document");
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await searchDocuments(searchQuery);
      setSearchResults(res.data.results || []);
    } catch (error) {
      pushToast("error", "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-mono text-3xl">Document Vault</h1>
        <p className="mt-1 text-sm text-slate-400">Securely store and organize your documents by life domains.</p>
      </header>
      {loadingDocs ? (
        <p className="font-mono text-sm text-slate-400 animate-pulse">Loading documents…</p>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {domains.map((domain) => (
              <DomainCard
                key={domain.id}
                domain={domain.id}
                icon={domain.icon}
                documents={grouped[domain.id]}
                status={statusByDomain[domain.id] || (grouped[domain.id].length ? "complete" : "idle")}
                error={errorByDomain[domain.id]}
                onUpload={(file) => uploadForDomain(domain.id, file)}
                onRemove={removeDocument}
              />
            ))}
          </div>

          {documents.length > 0 && (
            <section className="animate-slideUp rounded-xl border border-borderline bg-surface p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-mono text-lg text-slate-100 flex items-center gap-2">
                  <FileText size={18} className="text-cyan" />
                  All Uploaded Documents
                  <span className="rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 font-mono text-xs text-cyan">
                    {documents.length}
                  </span>
                  
                  <a
                    href={getBulkDownloadUrl()}
                    download="all_documents.zip"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/50 px-3 py-1 text-[11px] text-slate-400 hover:bg-cyan/10 hover:border-cyan/30 hover:text-cyan transition-colors"
                    title="Download entire vault as ZIP"
                  >
                    <Download size={14} />
                    <span className="hidden sm:inline font-mono uppercase tracking-wide">Download All</span>
                  </a>
                </h2>
                <form onSubmit={handleSearch} className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Semantic search..."
                      className="w-56 rounded-md border border-borderline bg-base py-1.5 pl-8 pr-3 text-sm text-slate-200 placeholder-slate-500 outline-none transition focus:border-cyan/50 focus:w-72"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching || !searchQuery.trim()}
                    className="flex items-center justify-center rounded-md border border-cyan/40 bg-cyan/10 px-3 py-1.5 font-mono text-xs text-cyan transition hover:bg-cyan/20 disabled:opacity-50"
                  >
                    {isSearching ? <Loader2 size={14} className="animate-spin" /> : "Search"}
                  </button>
                </form>
              </div>

              {searchResults.length > 0 && (
                <div className="mb-4 space-y-2 rounded-lg border border-cyan/20 bg-cyan/5 p-3">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                    Search Results · {searchResults.length} matches
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {searchResults.map((res, i) => (
                      <div key={i} className="rounded-lg border border-borderline bg-surface p-3">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
                            <FileText size={10} />
                            {res.chunk.filename}
                          </span>
                          <span className="rounded bg-cyan/10 px-1.5 py-0.5 font-mono text-[9px] text-cyan">
                            {Math.round(res.score * 100)}%
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-slate-300 line-clamp-3">
                          {res.chunk.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="overflow-x-auto rounded-lg border border-borderline">
                <table className="w-full text-left text-sm text-slate-300 min-w-[600px]">
                  <thead className="border-b border-borderline bg-white/5 font-mono text-[11px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Filename</th>
                      <th className="px-4 py-3 font-medium">Domain</th>
                      <th className="px-4 py-3 font-medium">Tags</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borderline bg-surface">
                    {documents.map((doc) => (
                      <tr key={doc.doc_id} className="transition hover:bg-white/5">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileText size={14} className="text-slate-500" />
                            <span className="font-medium text-slate-200">{doc.filename}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="capitalize text-slate-400">{doc.domain}</span>
                        </td>
                        <td className="px-4 py-3">
                          {doc.tags && doc.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {doc.tags.slice(0, 3).map((t) => (
                                <span
                                  key={t}
                                  className="rounded-full border border-borderline bg-white/5 px-2 py-0.5 text-[10px] text-slate-400"
                                >
                                  {t}
                                </span>
                              ))}
                              {doc.tags.length > 3 && (
                                <span className="rounded-full border border-borderline bg-white/5 px-2 py-0.5 text-[10px] text-slate-500">
                                  +{doc.tags.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600 font-mono text-[11px]">No tags</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2 text-slate-400">
                            <a
                              href={getDownloadUrl(doc.doc_id)}
                              download={doc.filename}
                              title="Download"
                              className="rounded p-1.5 transition hover:bg-cyan/10 hover:text-cyan"
                            >
                              <Download size={14} />
                            </a>
                            <button
                              type="button"
                              title="Delete"
                              onClick={() => removeDocument(doc.doc_id)}
                              className="rounded p-1.5 transition hover:bg-red-500/10 hover:text-red-400"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
