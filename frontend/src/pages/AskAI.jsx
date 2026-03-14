import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Bot,
  ChevronDown,
  ChevronUp,
  CreditCard,
  HeartPulse,
  IdCard,
  Loader2,
  Send,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { askAI } from "../api";
import { useToast } from "../context/ToastContext";
import MarkdownText from "../components/MarkdownText";

// ── Domain config ─────────────────────────────────────────────────────────────

const DOMAINS = [
  { id: "education", label: "Education", icon: BookOpen, color: "#3B82F6" },
  { id: "health", label: "Health", icon: HeartPulse, color: "#10B981" },
  { id: "finance", label: "Finance", icon: CreditCard, color: "#F59E0B" },
  { id: "identity", label: "Identity", icon: IdCard, color: "#8B5CF6" },
];

// ── Suggested questions ───────────────────────────────────────────────────────

const SUGGESTIONS = [
  "What educational qualifications do I have?",
  "Summarise my recent medical records.",
  "What are my main sources of income?",
  "List my identity documents and their expiry dates.",
  "Am I missing any important documents?",
  "What financial obligations do I currently have?",
];

// ── Sub-components ────────────────────────────────────────────────────────────

function DomainChip({ domain, active, onToggle }) {
  const Icon = domain.icon;
  return (
    <button
      type="button"
      onClick={() => onToggle(domain.id)}
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs transition"
      style={
        active
          ? {
              borderColor: domain.color + "99",
              backgroundColor: domain.color + "22",
              color: domain.color,
            }
          : {
              borderColor: "#1E1E2E",
              color: "#94a3b8",
              backgroundColor: "transparent",
            }
      }
    >
      <Icon size={11} />
      {domain.label}
    </button>
  );
}

function SourceChunk({ chunk }) {
  const [open, setOpen] = useState(false);
  const domainColor =
    DOMAINS.find((d) => d.id === chunk.domain)?.color ?? "#00E5FF";

  return (
    <article
      className="rounded-lg border border-borderline bg-base text-xs"
      style={{ borderLeft: `3px solid ${domainColor}` }}
    >
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="truncate font-mono text-slate-300">
          {chunk.filename}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <span
            className="rounded-full border px-1.5 py-0.5 text-[9px] uppercase"
            style={{ borderColor: domainColor + "66", color: domainColor }}
          >
            {chunk.domain}
          </span>
          {open ? (
            <ChevronUp size={12} className="text-slate-400" />
          ) : (
            <ChevronDown size={12} className="text-slate-400" />
          )}
        </span>
      </button>
      {open && (
        <p className="border-t border-borderline px-3 pb-3 pt-2 leading-5 text-slate-400">
          {chunk.text}
        </p>
      )}
    </article>
  );
}

function SourcesPanel({ chunks }) {
  const [open, setOpen] = useState(false);
  if (!chunks || chunks.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="inline-flex items-center gap-1.5 rounded-md border border-borderline bg-base px-2.5 py-1 font-mono text-[11px] text-slate-400 transition hover:border-cyan/40 hover:text-cyan"
      >
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        {chunks.length} source{chunks.length !== 1 ? "s" : ""} used
      </button>
      {open && (
        <div className="mt-2 space-y-2 animate-fadeIn">
          {chunks.map((chunk, idx) => (
            <SourceChunk
              key={`${chunk.chunk_id ?? chunk.doc_id}-${idx}`}
              chunk={chunk}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UserBubble({ text }) {
  return (
    <div className="flex items-start justify-end gap-3">
      <div className="max-w-[78%] rounded-2xl rounded-tr-sm bg-cyan/10 border border-cyan/20 px-4 py-2.5 text-sm text-slate-100 leading-6">
        {text}
      </div>
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan/30 bg-cyan/10">
        <User size={14} className="text-cyan" />
      </span>
    </div>
  );
}

function AiBubble({ text, chunks, loading }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-violet/40 bg-violet/10">
        {loading ? (
          <Loader2 size={14} className="animate-spin text-violet-300" />
        ) : (
          <Bot size={14} className="text-violet-300" />
        )}
      </span>
      <div className="max-w-[84%]">
        <div className="rounded-2xl rounded-tl-sm border border-borderline bg-surface px-4 py-2.5 text-sm leading-6 text-slate-200">
          {loading ? (
            <span className="inline-flex items-center gap-2 font-mono text-xs text-slate-400">
              <Loader2 size={12} className="animate-spin" />
              Thinking…
            </span>
          ) : (
            <MarkdownText text={text} />
          )}
        </div>
        {!loading && <SourcesPanel chunks={chunks} />}
      </div>
    </div>
  );
}

function WelcomeScreen({ onSuggestion }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 animate-fadeIn">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-violet/40 bg-violet/10 shadow-glow">
        <Sparkles size={28} className="text-violet-300" />
      </div>
      <h2 className="mt-5 font-mono text-xl text-slate-100">
        Ask your documents
      </h2>
      <p className="mt-2 max-w-md text-center text-sm text-slate-400">
        Powered by{" "}
        <span className="font-mono text-violet-300">AI Intelligence</span>. Ask
        anything — your answers are grounded in the files you've uploaded.
      </p>

      <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSuggestion(s)}
            className="rounded-xl border border-borderline bg-surface px-4 py-3 text-left text-xs text-slate-300 transition hover:border-cyan/40 hover:bg-cyan/5 hover:text-cyan"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AskAI() {
  const { pushToast } = useToast();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeDomains, setActiveDomains] = useState(DOMAINS.map((d) => d.id));

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const toggleDomain = (id) => {
    setActiveDomains((prev) => {
      if (prev.includes(id)) {
        // Keep at least one domain active
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== id);
      }
      return [...prev, id];
    });
  };

  const selectAllDomains = () => setActiveDomains(DOMAINS.map((d) => d.id));

  const clearChat = () => {
    setMessages([]);
    setInput("");
  };

  const send = async (questionOverride) => {
    const question = (questionOverride ?? input).trim();
    if (!question || loading) return;

    setInput("");
    setLoading(true);

    // Append user message immediately
    const userMsg = { role: "user", text: question };
    setMessages((prev) => [...prev, userMsg]);

    // Append a placeholder AI message
    setMessages((prev) => [
      ...prev,
      { role: "assistant", text: "", chunks: [], loading: true },
    ]);

    try {
      const { data } = await askAI(question, activeDomains);
      const aiText = data.answer ?? "No answer returned.";
      const aiChunks = data.chunks_used ?? [];

      // Replace placeholder with real response
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          text: aiText,
          chunks: aiChunks,
          loading: false,
        };
        return updated;
      });
    } catch (err) {
      const detail =
        err?.response?.data?.detail ??
        "AI query failed. Check backend connection.";
      pushToast("error", detail);

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          text: `Sorry, something went wrong:\n${detail}`,
          chunks: [],
          loading: false,
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const allActive = activeDomains.length === DOMAINS.length;

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col gap-0 md:h-[calc(100vh-4rem)]">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <div>
          <h1 className="font-mono text-3xl">Ask AI</h1>
          <p className="mt-1 text-sm text-slate-400">
            AI Intelligence · grounded in your uploaded documents
          </p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearChat}
            className="inline-flex items-center gap-2 rounded-md border border-borderline px-3 py-1.5 font-mono text-xs text-slate-400 transition hover:border-red-500/50 hover:text-red-300"
          >
            <X size={13} />
            Clear chat
          </button>
        )}
      </header>

      {/* ── Domain filter chips ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-borderline pb-3">
        <span className="font-mono text-[11px] uppercase tracking-widest text-slate-500">
          Search in:
        </span>
        {DOMAINS.map((d) => (
          <DomainChip
            key={d.id}
            domain={d}
            active={activeDomains.includes(d.id)}
            onToggle={toggleDomain}
          />
        ))}
        {!allActive && (
          <button
            type="button"
            onClick={selectAllDomains}
            className="rounded-full border border-dashed border-slate-600 px-3 py-1 font-mono text-[11px] text-slate-500 transition hover:border-slate-400 hover:text-slate-300"
          >
            All
          </button>
        )}
      </div>

      {/* ── Message list ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-4">
        {messages.length === 0 ? (
          <WelcomeScreen onSuggestion={(s) => send(s)} />
        ) : (
          <div className="space-y-5">
            {messages.map((msg, idx) =>
              msg.role === "user" ? (
                <UserBubble key={idx} text={msg.text} />
              ) : (
                <AiBubble
                  key={idx}
                  text={msg.text}
                  chunks={msg.chunks}
                  loading={msg.loading}
                />
              ),
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Input bar ───────────────────────────────────────────────────────── */}
      <div className="border-t border-borderline pt-4">
        <div className="flex items-end gap-3 rounded-xl border border-borderline bg-surface px-4 py-3 focus-within:border-cyan/50 transition">
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Ask anything about your documents… (Enter to send, Shift+Enter for newline)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            className="flex-1 resize-none bg-transparent font-sans text-sm text-slate-100 placeholder-slate-500 outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan/20 text-cyan transition hover:bg-cyan/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
          </button>
        </div>
        <p className="mt-2 text-center font-mono text-[10px] text-slate-600">
          Answers are grounded in your uploaded documents only · Powered by
          AI Intelligence
        </p>
      </div>
    </div>
  );
}
