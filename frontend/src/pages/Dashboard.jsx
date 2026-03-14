import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BookOpen,
  CreditCard,
  HeartPulse,
  IdCard,
  RefreshCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
} from "lucide-react";
import { api, healthCheck, queryTransition } from "../api";
import { useToast } from "../context/ToastContext";
import MarkdownText from "../components/MarkdownText";

// ── Domain config ─────────────────────────────────────────────────────────────

const DOMAIN_META = {
  education: { icon: BookOpen, color: "#3B82F6", label: "Education" },
  health: { icon: HeartPulse, color: "#10B981", label: "Health" },
  finance: { icon: CreditCard, color: "#F59E0B", label: "Finance" },
  identity: { icon: IdCard, color: "#8B5CF6", label: "Identity" },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusPill({ ok, label }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs ${
        ok
          ? "border-emerald-500/40 bg-emerald-900/30 text-emerald-300"
          : "border-red-500/40 bg-red-900/30 text-red-300"
      }`}
    >
      {ok ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
      {label}
    </span>
  );
}

function HealthBar({ health }) {
  if (!health) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-borderline bg-surface px-4 py-3">
      <Activity size={14} className="text-slate-400" />
      <span className="mr-2 font-mono text-xs text-slate-400">Services:</span>
      <StatusPill ok={health.gemini_configured} label="AI Engine" />
      <span className="ml-auto font-mono text-[11px] text-slate-500">
        {health.document_count ?? 0} docs · {health.chunk_count ?? 0} data points extracted
      </span>
    </div>
  );
}

function DomainStatCard({ domain, count, lastUpdated, tags }) {
  const meta = DOMAIN_META[domain];
  if (!meta) return null;
  const Icon = meta.icon;

  return (
    <article
      className="rounded-xl border border-borderline bg-surface p-4 transition hover:border-white/10"
      style={{ borderLeft: `4px solid ${meta.color}` }}
    >
      <div className="flex items-center gap-2">
        <Icon size={15} style={{ color: meta.color }} />
        <h3 className="font-mono text-sm capitalize text-slate-200">
          {meta.label}
        </h3>
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-100">
        {count}
      </p>
      <p className="mt-0.5 text-xs text-slate-500">
        {count === 1 ? "document" : "documents"}
      </p>
      <p className="mt-2 text-[11px] text-slate-500">
        Updated: <span className="text-slate-400">{lastUpdated}</span>
      </p>
      {tags && tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full border px-2 py-0.5 font-mono text-[9px] text-slate-400"
              style={{ borderColor: meta.color + "44" }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { pushToast } = useToast();

  const [documents, setDocuments] = useState([]);
  const [health, setHealth] = useState(null);
  const [summary, setSummary] = useState(
    () => localStorage.getItem("contextbridge:lastSummary") || "",
  );
  const [loading, setLoading] = useState(false);
  const [docsLoading, setDocsLoading] = useState(true);

  // ── Load documents + health status on mount ──────────────────────────────
  useEffect(() => {
    const loadAll = async () => {
      try {
        const [docsRes, healthRes] = await Promise.allSettled([
          api.get("/documents"),
          healthCheck(),
        ]);
        if (docsRes.status === "fulfilled") {
          setDocuments(docsRes.value.data || []);
        }
        if (healthRes.status === "fulfilled") {
          setHealth(healthRes.value.data);
        }
      } catch {
        pushToast("error", "Could not load dashboard data");
      } finally {
        setDocsLoading(false);
      }
    };

    loadAll();

    // Auto-generate summary if no cached one exists
    if (!localStorage.getItem("contextbridge:lastSummary")) {
      generateSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Generate cross-domain summary via Gemini ─────────────────────────────
  const generateSummary = async () => {
    setLoading(true);
    try {
      const res = await queryTransition("custom");
      const text = res.data.summary || "No summary returned.";
      const chunks = res.data.chunks_used || [];

      setSummary(text);
      localStorage.setItem("contextbridge:lastSummary", text);
      localStorage.setItem("contextbridge:lastChunks", JSON.stringify(chunks));
      pushToast("success", "Summary refreshed");
    } catch {
      const fallback =
        "Unable to generate summary. Make sure the backend is running and your GEMINI_API_KEY is set.";
      setSummary(fallback);
      pushToast("error", "Summary generation failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Domain statistics ─────────────────────────────────────────────────────
  const domainStats = useMemo(() => {
    const base = Object.fromEntries(
      Object.keys(DOMAIN_META).map((d) => [
        d,
        { count: 0, lastUpdated: "—", tags: [] },
      ]),
    );

    documents.forEach((doc) => {
      if (!base[doc.domain]) return;
      base[doc.domain].count += 1;
      base[doc.domain].lastUpdated = "Recently";

      // Collect unique tags from each document
      if (Array.isArray(doc.tags)) {
        const existing = new Set(base[doc.domain].tags);
        doc.tags.forEach((t) => existing.add(t));
        base[doc.domain].tags = [...existing];
      }
    });

    return base;
  }, [documents]);

  const totalDocs = documents.length;
  const activeDomains = Object.values(domainStats).filter(
    (s) => s.count > 0,
  ).length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            AI-powered overview of your document vault.
          </p>
        </div>

        <button
          type="button"
          onClick={generateSummary}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-cyan/60 bg-cyan/10 px-4 py-2 font-mono text-xs text-cyan transition hover:bg-cyan/20 disabled:opacity-50"
        >
          <RefreshCcw size={13} className={loading ? "animate-spin" : ""} />
          Refresh Summary
        </button>
      </header>

      {/* Service health bar */}
      <HealthBar health={health} />

      {/* Quick-stat row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Documents", value: totalDocs, accent: "#00E5FF" },
          { label: "Active Domains", value: activeDomains, accent: "#7C3AED" },
          {
            label: "Data Points",
            value: health?.chunk_count ?? "—",
            accent: "#10B981",
          },
          {
            label: "AI Model",
            value: "Active",
            accent: "#F59E0B",
            sub: "AI",
          },
        ].map(({ label, value, accent, sub }) => (
          <div
            key={label}
            className="rounded-xl border border-borderline bg-surface px-4 py-3"
            style={{ borderTop: `2px solid ${accent}` }}
          >
            <p className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
              {label}
            </p>
            <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-100">
              {sub && (
                <span className="mr-1 text-xs text-slate-400">{sub}</span>
              )}
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Domain stat cards */}
      {docsLoading ? (
        <p className="font-mono text-sm text-slate-400 animate-pulse">
          Loading domain stats…
        </p>
      ) : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Object.entries(domainStats).map(([domain, stat]) => (
            <DomainStatCard
              key={domain}
              domain={domain}
              count={stat.count}
              lastUpdated={stat.lastUpdated}
              tags={stat.tags}
            />
          ))}
        </section>
      )}

      {/* AI Summary */}
      <section className="animate-slideUp rounded-xl border border-cyan/20 bg-surface p-5 shadow-glow">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles size={15} className="text-violet-300" />
          <h2 className="font-mono text-base text-slate-100">
            Life Snapshot · Complete Overview
          </h2>
          {!loading && summary && (
            <span className="ml-auto rounded-full border border-emerald-500/30 bg-emerald-900/20 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
              Ready
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            <p className="flex items-center gap-2 font-mono text-sm text-slate-400">
              <RefreshCcw size={13} className="animate-spin text-violet-300" />
              Generating AI summary…
            </p>
            {[80, 65, 72].map((w) => (
              <div
                key={w}
                className="h-3 animate-pulse rounded bg-white/5"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        ) : summary ? (
          <div className="text-slate-200">
            <MarkdownText text={summary} />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Eye size={24} className="text-slate-500" />
            <p className="font-mono text-sm text-slate-400">No summary yet.</p>
            <p className="max-w-sm text-xs text-slate-500">
              Upload documents to your Vault, then click{" "}
              <span className="text-cyan">Refresh Summary</span> to generate a
              AI-powered intelligence overview.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
