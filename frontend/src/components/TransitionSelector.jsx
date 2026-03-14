import { useMemo } from "react";

const iconMap = {
  briefcase: "[JOB]",
  stethoscope: "[MED]",
  bank: "[FIN]",
  "map-pin": "[LOC]",
  sliders: "[ALL]",
};

export default function TransitionSelector({
  transition,
  selected,
  onSelect,
  onGenerate,
  onShowDocuments,
  loading,
}) {
  const domainLabel = useMemo(() => transition.domains.join(", "), [transition.domains]);

  return (
    <article
      className={`rounded-xl border bg-surface p-4 transition ${
        selected ? "border-cyan/60 shadow-glow" : "border-borderline"
      }`}
    >
      <button type="button" className="w-full text-left" onClick={() => onSelect(transition.id)}>
        <div className="mb-1 font-mono text-sm text-violet">{iconMap[transition.icon] || "[TRN]"}</div>
        <h3 className="font-mono text-lg">{transition.label}</h3>
        <p className="mt-1 text-xs text-slate-400">Uses {domainLabel}</p>
      </button>

      {selected ? (
        <div className="mt-4 flex gap-3 animate-slideUp">
          <button
            type="button"
            disabled={loading}
            onClick={() => onGenerate(transition.id)}
            className="flex-1 rounded-md border border-cyan/70 bg-cyan/10 px-3 py-2 font-mono text-xs text-cyan transition enabled:hover:bg-cyan/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Querying..." : "Generate Summary"}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onShowDocuments) onShowDocuments(transition);
            }}
            className="flex-1 rounded-md border border-violet-500/50 bg-violet-500/10 px-3 py-2 font-mono text-xs text-violet-300 transition hover:bg-violet-500/20"
          >
            Documents
          </button>
        </div>
      ) : null}
    </article>
  );
}
