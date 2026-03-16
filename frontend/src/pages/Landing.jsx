import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Bot,
  CreditCard,
  FileSearch,
  HeartPulse,
  IdCard,
  Layers,
  ScanLine,
  Sparkles,
  Zap,
} from "lucide-react";

// ── Floating domain nodes ─────────────────────────────────────────────────────

function Node({ label, className, color }) {
  return (
    <div className={`domain-node ${className}`} style={{ color }}>
      <span>{label}</span>
    </div>
  );
}

// ── Feature card ──────────────────────────────────────────────────────────────

function FeatureCard({ icon: Icon, title, description, accent }) {
  return (
    <div
      className="rounded-xl border border-borderline bg-surface/60 p-5 backdrop-blur-sm transition hover:border-white/10"
      style={{ borderTop: `2px solid ${accent}` }}
    >
      <div
        className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg"
        style={{ backgroundColor: accent + "22", color: accent }}
      >
        <Icon size={17} />
      </div>
      <h3 className="font-mono text-sm text-slate-100">{title}</h3>
      <p className="mt-1.5 text-xs leading-5 text-slate-400">{description}</p>
    </div>
  );
}

// ── Domain badge row ──────────────────────────────────────────────────────────

function DomainBadge({ icon: Icon, label, color }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs"
      style={{
        borderColor: color + "55",
        backgroundColor: color + "18",
        color,
      }}
    >
      <Icon size={11} />
      {label}
    </span>
  );
}

// ── Main landing page ─────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: ScanLine,
    title: "Image Understanding",
    description:
      "Automatically extract text and meaning from PDFs, scanned documents, and images natively.",
    accent: "#3B82F6",
  },
  {
    icon: Sparkles,
    title: "AI Intelligence",
    description:
      "Generate cross-domain intelligence summaries and answer questions about your documents using advanced AI.",
    accent: "#7C3AED",
  },
  {
    icon: Bot,
    title: "AI Assistant",
    description:
      "Ask natural language questions. Get precise, grounded answers cited directly from your uploaded files.",
    accent: "#00E5FF",
  },
  {
    icon: Layers,
    title: "Domain Vault",
    description:
      "Organise documents across Education, Health, Finance, and Identity domains with smart AI tagging on upload.",
    accent: "#10B981",
  },
  {
    icon: FileSearch,
    title: "Semantic Search",
    description:
      "Find exactly what you need across all your documents by searching for meaning, not just exact words.",
    accent: "#F59E0B",
  },
  {
    icon: Zap,
    title: "Life Transitions",
    description:
      "Instantly package the right documents for job changes, medical events, financial planning, or relocation.",
    accent: "#EC4899",
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-bg min-h-screen text-slate-100">
      {/* ── Hero section ──────────────────────────────────────────────────────── */}
      <div className="mx-auto grid min-h-screen max-w-[1280px] grid-cols-1 items-center gap-12 px-6 py-16 lg:grid-cols-2">
        {/* Left: copy */}
        <section className="animate-fadeIn">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-3 py-1">
            <Sparkles size={11} className="text-violet-300" />
            <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-cyan">
              SmartLINK
            </span>
          </div>

          {/* Headline */}
          <h1 className="mt-5 font-mono text-4xl font-semibold leading-tight md:text-[3.25rem] md:leading-[1.15]">
            Your intelligent{" "}
            <span
              className="text-transparent"
              style={{
                WebkitTextStroke: "1px #00E5FF",
                textShadow: "0 0 40px rgba(0,229,255,0.3)",
              }}
            >
              document
            </span>{" "}
            bridge.
          </h1>

          {/* Sub-copy */}
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
            Unify records across Education, Health, Finance, and Identity.
            Your{" "}
            <span className="font-mono text-violet-300">personal knowledge base</span>{" "}
            that connects the dots across your life.
          </p>

          {/* Domain badges */}
          <div className="mt-6 flex flex-wrap gap-2">
            <DomainBadge icon={BookOpen} label="Education" color="#3B82F6" />
            <DomainBadge icon={HeartPulse} label="Health" color="#10B981" />
            <DomainBadge icon={CreditCard} label="Finance" color="#F59E0B" />
            <DomainBadge icon={IdCard} label="Identity" color="#8B5CF6" />
          </div>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/vault")}
              className="rounded-lg border border-cyan/70 bg-cyan/10 px-6 py-3 font-mono text-sm text-cyan shadow-glow transition hover:bg-cyan/20"
            >
              Open Vault
            </button>
            <button
              type="button"
              onClick={() => navigate("/ask")}
              className="inline-flex items-center gap-2 rounded-lg border border-violet/50 bg-violet/10 px-6 py-3 font-mono text-sm text-violet-300 transition hover:bg-violet/20"
            >
              <Bot size={15} />
              Ask AI
            </button>
          </div>

        </section>

        {/* Right: animated node diagram */}
        <section className="relative mx-auto h-[420px] w-full max-w-[520px]">
          <div className="center-node">Unified Context</div>
          <Node label="Education" className="node-a" color="#3B82F6" />
          <Node label="Health" className="node-b" color="#10B981" />
          <Node label="Finance" className="node-c" color="#F59E0B" />
          <Node label="Identity" className="node-d" color="#8B5CF6" />
          <div className="connector con-a" />
          <div className="connector con-b" />
          <div className="connector con-c" />
          <div className="connector con-d" />
        </section>
      </div>

      {/* ── Features grid ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1280px] px-6 pb-20">
        <div className="mb-8 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-slate-500">
            What's included
          </p>
          <h2 className="mt-3 font-mono text-2xl text-slate-100">
            Everything you need. At one place.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* ── Footer bar ────────────────────────────────────────────────────────── */}
      <div className="border-t border-borderline bg-surface/70 px-6 py-3">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-xs tracking-[0.15em] text-slate-400">
            SmartLINK · Intelligent Document Vault
          </p>
        </div>
      </div>
    </div>
  );
}
