const STATE_STYLES = {
  idle: "border-slate-500/40 bg-slate-800 text-slate-300",
  processing: "border-cyan/60 bg-cyan/10 text-cyan animate-pulseCyan",
  complete: "border-emerald-500/50 bg-emerald-900/30 text-emerald-300",
  failed: "border-red-500/50 bg-red-900/30 text-red-300",
};

const STATE_LABELS = {
  idle: "No documents",
  processing: "Processing...",
  complete: "Ready",
  failed: "OCR Failed",
};

export default function OCRStatusBadge({ state = "idle" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-mono ${STATE_STYLES[state] || STATE_STYLES.idle}`}
    >
      {STATE_LABELS[state] || STATE_LABELS.idle}
    </span>
  );
}
