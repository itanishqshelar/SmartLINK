import { useState } from "react";

const domainColors = {
  education: "#3B82F6",
  health: "#10B981",
  finance: "#F59E0B",
  identity: "#8B5CF6",
};

function ChunkCard({ chunk }) {
  const [expanded, setExpanded] = useState(false);
  const text = chunk.text || "(No text returned)";
  const short = text.slice(0, 200);
  const shouldTruncate = text.length > 200;
  const color = domainColors[chunk.domain] || "#00E5FF";

  return (
    <article className="rounded-lg border border-borderline bg-surface p-3" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate font-mono text-xs text-slate-300">{chunk.source}</span>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase text-slate-300">
          {chunk.domain}
        </span>
      </div>
      <p className="text-xs leading-5 text-slate-300">{expanded || !shouldTruncate ? text : `${short}...`}</p>
      {shouldTruncate ? (
        <button
          type="button"
          className="mt-2 font-mono text-[11px] text-cyan"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "show less" : "show more"}
        </button>
      ) : null}
    </article>
  );
}

export default function ChunkViewer({ chunks = [] }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="mt-4 rounded-xl border border-borderline bg-base">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="font-mono text-sm">{chunks.length} sources used</span>
        <span className={`text-cyan transition ${open ? "rotate-180" : ""}`}>v</span>
      </button>
      {open ? (
        <div className="space-y-3 border-t border-borderline p-4 animate-fadeIn">
          {chunks.map((chunk, idx) => (
            <ChunkCard key={`${chunk.source}-${idx}`} chunk={chunk} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
