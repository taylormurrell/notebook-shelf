// Renders text with case-insensitive matches of `query` wrapped in <mark>.
// Safe: builds React text nodes (no dangerouslySetInnerHTML).
export function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;

  const parts: React.ReactNode[] = [];
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  let i = 0;
  let key = 0;

  for (;;) {
    const idx = lower.indexOf(ql, i);
    if (idx < 0) break;
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark
        key={key++}
        className="rounded-sm text-foreground"
        style={{ background: "rgba(124,111,91,0.22)" }}
      >
        {text.slice(idx, idx + q.length)}
      </mark>,
    );
    i = idx + q.length;
  }
  parts.push(text.slice(i));
  return <>{parts}</>;
}
