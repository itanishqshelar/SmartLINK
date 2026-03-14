import MarkdownText from "./MarkdownText";

export default function SummaryCard({ text }) {
  return (
    <section className="animate-slideUp rounded-xl border border-cyan/30 bg-surface p-5 shadow-glow">
      <h3 className="font-mono text-lg text-cyan">Generated Summary</h3>
      <div className="mt-3">
        <MarkdownText text={text} />
      </div>
    </section>
  );
}
