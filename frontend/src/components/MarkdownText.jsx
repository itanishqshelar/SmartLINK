import ReactMarkdown from "react-markdown";

export default function MarkdownText({ text, className = "" }) {
  if (!text) return null;

  return (
    <div className={`font-sans text-sm leading-6 text-slate-200 ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="mt-6 mb-3 font-mono text-xl font-semibold text-slate-100" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="mt-5 mb-2 font-mono text-lg font-semibold text-slate-100" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="mt-4 mb-2 font-mono text-base font-medium text-slate-100" {...props} />
          ),
          p: ({ node, ...props }) => <p className="mb-3 last:mb-0" {...props} />,
          ul: ({ node, ...props }) => (
            <ul className="mb-4 ml-5 list-outside list-disc space-y-1 marker:text-cyan/60" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="mb-4 ml-5 list-outside list-decimal space-y-1 marker:text-cyan/60" {...props} />
          ),
          li: ({ node, ...props }) => <li className="pl-1" {...props} />,
          strong: ({ node, ...props }) => (
            <strong className="font-semibold text-slate-100" {...props} />
          ),
          em: ({ node, ...props }) => <em className="italic text-slate-300" {...props} />,
          code: ({ node, inline, ...props }) =>
            inline ? (
              <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-[11px] text-cyan" {...props} />
            ) : (
              <pre className="mt-2 mb-4 overflow-x-auto rounded-lg border border-borderline bg-base p-3">
                <code className="font-mono text-[11px] text-slate-300" {...props} />
              </pre>
            ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
