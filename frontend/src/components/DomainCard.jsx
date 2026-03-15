import { useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Download,
  FilePlus2,
  FileText,
  Layers,
  Sparkles,
  Trash2,
} from "lucide-react";
import OCRStatusBadge from "./OCRStatusBadge";
import { getBulkDownloadUrl, getDownloadUrl } from "../api";

// ── Domain colour map ─────────────────────────────────────────────────────────

const DOMAIN_COLORS = {
  education: "#3B82F6",
  health: "#10B981",
  finance: "#F59E0B",
  identity: "#8B5CF6",
};

// ── OCR method badge ──────────────────────────────────────────────────────────

const OCR_METHOD_LABELS = {
  native: { label: "Native text", color: "#10B981" },
  vision: { label: "AI Vision", color: "#3B82F6" },
  blip: { label: "AI Vision", color: "#3B82F6" },
  text: { label: "Plain text", color: "#6B7280" },
  failed: { label: "OCR failed", color: "#EF4444" },
};

function OcrMethodPill({ method }) {
  const meta = OCR_METHOD_LABELS[method] ?? OCR_METHOD_LABELS.text;
  return (
    <span
      className="rounded-full border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide"
      style={{ borderColor: meta.color + "55", color: meta.color }}
    >
      {meta.label}
    </span>
  );
}

// ── Per-document row ──────────────────────────────────────────────────────────

function DocumentRow({ doc, accentColor, onRemove }) {
  const [expanded, setExpanded] = useState(false);

  const hasSummary = Boolean(doc.summary);
  const hasTags = Array.isArray(doc.tags) && doc.tags.length > 0;
  const hasDetails = hasSummary || hasTags;

  return (
    <li className="rounded-lg border border-borderline bg-base overflow-hidden">
      {/* ── Top row ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* File icon */}
        <FileText size={13} className="shrink-0 text-slate-500" />

        {/* Filename */}
        <span className="flex-1 truncate text-xs text-slate-200">
          {doc.filename}
        </span>

        {/* OCR method */}
        <OcrMethodPill method={doc.ocr_method} />

        {/* Chunk count */}
        <span className="hidden font-mono text-[10px] text-slate-500 sm:inline">
          {doc.chunk_count} pts
        </span>

        {/* Expand / collapse details */}
        {hasDetails && (
          <button
            type="button"
            title="Show AI insights"
            onClick={() => setExpanded((p) => !p)}
            className="rounded p-0.5 text-slate-500 transition hover:text-violet-300"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )}

        {/* Download */}
        <a
          href={getDownloadUrl(doc.doc_id)}
          download={doc.filename}
          title="Download original file"
          className="rounded p-0.5 text-slate-500 transition hover:text-cyan"
          onClick={(e) => e.stopPropagation()}
        >
          <Download size={13} />
        </a>

        {/* Delete */}
        <button
          type="button"
          title="Remove document"
          onClick={() => onRemove(doc.doc_id)}
          className="rounded p-0.5 text-slate-500 transition hover:text-red-300"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* ── Expanded: AI summary + tags ────────────────────────────────────── */}
      {expanded && hasDetails && (
        <div
          className="border-t border-borderline px-3 pb-3 pt-2 space-y-2 animate-fadeIn"
          style={{ borderLeft: `3px solid ${accentColor}` }}
        >
          {/* Tags */}
          {hasTags && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Sparkles size={10} className="shrink-0 text-violet-400" />
              {doc.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border px-2 py-0.5 font-mono text-[9px] text-slate-400"
                  style={{ borderColor: accentColor + "44" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Summary */}
          {hasSummary && (
            <p className="text-[11px] leading-5 text-slate-400 italic">
              {doc.summary}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

// ── Main DomainCard ───────────────────────────────────────────────────────────

export default function DomainCard({
  domain,
  icon,
  documents,
  status,
  error,
  onUpload,
  onRemove,
}) {
  const fileInputRef = useRef(null);
  const accentColor = DOMAIN_COLORS[domain] ?? "#00E5FF";

  // Drag-and-drop
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) onUpload(file);
  };

  // Collect all unique tags across this domain's documents
  const domainTags = [
    ...new Set(documents.flatMap((d) => (Array.isArray(d.tags) ? d.tags : []))),
  ].slice(0, 6);

  return (
    <section
      className="animate-slideUp rounded-xl border border-borderline bg-surface p-4"
      style={{ borderLeft: `4px solid ${accentColor}` }}
    >
      {/* ── Card header ──────────────────────────────────────────────────────── */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-mono text-lg capitalize">{domain}</h3>
          
          {documents.length > 0 && (
            <a
              href={getBulkDownloadUrl(domain)}
              download={`${domain}_documents.zip`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/50 px-2 py-1 text-[10px] text-slate-400 hover:bg-cyan/10 hover:border-cyan/30 hover:text-cyan transition-colors"
              title="Download all documents in this domain"
            >
              <Download size={11} />
              <span className="font-mono uppercase tracking-wide">All</span>
            </a>
          )}
        </div>
        <OCRStatusBadge state={status} />
      </div>

      {/* ── Domain-level stats ────────────────────────────────────────────────── */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 font-mono text-xs text-slate-400">
          <Layers size={11} />
          {documents.length} {documents.length === 1 ? "document" : "documents"}
        </span>

        {documents.length > 0 && (
          <span className="font-mono text-xs text-slate-500">
            {documents.reduce((s, d) => s + (d.chunk_count || 0), 0)} data points
          </span>
        )}
      </div>

      {/* ── Domain tag cloud (aggregated from all docs) ─────────────────────── */}
      {domainTags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {domainTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border px-2 py-0.5 font-mono text-[9px] text-slate-500"
              style={{ borderColor: accentColor + "33" }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* ── Document list ─────────────────────────────────────────────────────── */}
      {documents.length > 0 && (
        <ul className="mb-4 space-y-1.5">
          {documents.map((doc) => (
            <DocumentRow
              key={doc.doc_id}
              doc={doc}
              accentColor={accentColor}
              onRemove={onRemove}
            />
          ))}
        </ul>
      )}

      {/* ── Upload drop zone ──────────────────────────────────────────────────── */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="rounded-lg border border-dashed border-cyan/30 bg-base/60 p-4 text-center transition hover:border-cyan/50 hover:bg-cyan/5"
      >
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-md border border-cyan/40 px-3 py-1.5 font-mono text-xs text-cyan transition hover:bg-cyan/10"
        >
          <FilePlus2 size={13} />
          Drop file or click to upload
        </button>
        <p className="mt-1.5 font-mono text-[10px] text-slate-600">
          PDF · DOCX · Images · TXT · CSV
        </p>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.txt,.md,.csv,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.tif,.webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onUpload(file);
              // Reset so the same file can be re-uploaded
              e.target.value = "";
            }
          }}
        />
      </div>

      {/* ── Error message ────────────────────────────────────────────────────── */}
      {error && (
        <p className="mt-2 rounded-lg border border-red-500/30 bg-red-900/20 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}
