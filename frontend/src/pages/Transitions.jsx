import { useEffect, useState } from "react";
import { Download, FileText, X, Plus } from "lucide-react";
import TransitionSelector from "../components/TransitionSelector";
import ChunkViewer from "../components/ChunkViewer";
import SummaryCard from "../components/SummaryCard";
import { getTransitions, queryTransition, listDocuments, getDownloadUrl, getBulkDownloadUrl } from "../api";
import { useToast } from "../context/ToastContext";

export default function Transitions() {
  const { pushToast } = useToast();
  const [transitions, setTransitions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [chunks, setChunks] = useState([]);
  const [allDocs, setAllDocs] = useState([]);
  const [showDocsModal, setShowDocsModal] = useState(null);

  useEffect(() => {
    Promise.all([getTransitions(), listDocuments()])
      .then(([transRes, docsRes]) => {
        const transData = transRes.data || [];
        setTransitions(transData);
        if (transData.length) {
          setSelected(transData[0].id);
        }
        setAllDocs(docsRes.data || []);
      })
      .catch(() => pushToast("error", "Could not load life transitions or documents"));
  }, []);

  const runQuery = async (transitionId) => {
    setLoading(true);
    setSummary("");
    setChunks([]);
    pushToast("processing", "Querying your documents via AI…");

    try {
      const response = await queryTransition(transitionId);
      const generatedSummary = response.data.summary || "No summary returned.";
      const usedChunks = response.data.chunks_used || [];

      setSummary(generatedSummary);
      setChunks(usedChunks);
      localStorage.setItem("contextbridge:lastSummary", generatedSummary);
      localStorage.setItem(
        "contextbridge:lastChunks",
        JSON.stringify(usedChunks),
      );
      pushToast("success", "Summary generated successfully");
    } catch (err) {
      const detail =
        err?.response?.data?.detail ??
        "Transition query failed. Check backend.";
      pushToast("error", detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-mono text-3xl">Life Transitions</h1>
          <p className="text-sm text-slate-400">
            Get a personalized summary of your documents for important life events.
          </p>
        </div>

        <a 
          href={getBulkDownloadUrl()}
          download="all_documents.zip"
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-fit items-center gap-2 rounded-md border border-cyan/30 bg-cyan/10 px-4 py-2 font-mono text-xs text-cyan transition hover:bg-cyan/20"
        >
          <Download size={15} />
          Download All Docs
        </a>
      </header>

      {transitions.length === 0 ? (
        <p className="font-mono text-sm text-slate-400 animate-pulse">
          Loading transitions…
        </p>
      ) : (
        <section className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {transitions.map((transition) => (
            <TransitionSelector
              key={transition.id}
              transition={transition}
              selected={selected === transition.id}
              onSelect={(id) => {
                setSelected(id);
                setSummary("");
                setChunks([]);
              }}
              onGenerate={runQuery}
              onShowDocuments={(trans) => setShowDocsModal(trans)}
              loading={selected === transition.id && loading}
            />
          ))}
        </section>
      )}

      {summary ? (
        <section className="space-y-3">
          <SummaryCard text={summary} />
          <ChunkViewer chunks={chunks} />
        </section>
      ) : null}

      {showDocsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-borderline bg-surface p-6 shadow-glow animate-slideUp">
            <div className="mb-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-mono text-xl text-slate-100 flex items-center gap-2">
                  <FileText className="text-violet-400" size={20} />
                  Documents for {showDocsModal.label}
                </h2>
                <button
                  onClick={() => setShowDocsModal(null)}
                  className="rounded p-1 text-slate-500 transition hover:bg-white/5 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={(() => {
                    const domains = showDocsModal.domains;
                    if (domains.length === 1) return getBulkDownloadUrl(domains[0]);
                    return getBulkDownloadUrl();
                  })()}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-md border border-cyan/40 bg-cyan/10 px-3 py-1.5 font-mono text-xs text-cyan transition hover:bg-cyan/20"
                >
                  <Download size={14} />
                  Download All Documents
                </a>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 font-mono text-xs text-emerald-400 transition hover:bg-emerald-500/20"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
              {(() => {
                const requiredDocs = allDocs.filter((d) =>
                  showDocsModal.domains.includes(d.domain),
                );
                if (requiredDocs.length === 0) {
                  return (
                    <p className="text-sm font-mono text-slate-400">
                      No matching documents found in your vault for these domains ({showDocsModal.domains.join(", ")}).
                    </p>
                  );
                }
                return requiredDocs.map((doc) => (
                  <div
                    key={doc.doc_id}
                    className="flex items-center justify-between rounded-lg border border-borderline bg-base p-3"
                  >
                    <div className="flex items-center gap-3">
                      <FileText size={16} className="text-slate-500" />
                      <div>
                        <p className="text-sm font-medium text-slate-200">
                          {doc.filename}
                        </p>
                        <p className="font-mono text-[10px] capitalize text-slate-400">
                          {doc.domain}
                        </p>
                      </div>
                    </div>
                    <a
                      href={getDownloadUrl(doc.doc_id)}
                      download={doc.filename}
                      className="flex items-center gap-1.5 rounded-md border border-cyan/40 bg-cyan/10 px-3 py-1.5 font-mono text-xs text-cyan transition hover:bg-cyan/20"
                    >
                      <Download size={14} />
                      Download
                    </a>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
