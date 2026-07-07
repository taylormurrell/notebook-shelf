import Link from "next/link";
import type { Notebook } from "@/lib/notebooks";
import { coverStyle } from "@/lib/notebook-styles";

// A forward-facing notebook cover. Per the PRD: no title on the cover itself;
// the topic appears below on hover or keyboard focus. Hover/focus lifts the
// cover slightly and deepens its shadow (pure CSS, no animation libraries).
export function NotebookCard({ notebook }: { notebook: Notebook }) {
  const c = coverStyle(notebook.coverColor);

  return (
    <li className="group">
      <Link
        href={`/app/notebooks/${notebook.id}`}
        aria-label={`Open ${notebook.topic}`}
        className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div
          className="relative aspect-[3/4] w-full rounded-l-sm rounded-r-lg shadow-md transition duration-300 ease-out group-hover:-translate-y-2 group-hover:shadow-xl group-focus-within:-translate-y-2 group-focus-within:shadow-xl"
          style={{
            background: `linear-gradient(135deg, ${c.sheen} 0%, ${c.base} 45%, ${c.dark} 100%)`,
          }}
        >
          {/* binding on the left edge */}
          <span
            className="absolute inset-y-0 left-0 w-3 rounded-l-sm"
            style={{
              background: c.dark,
              boxShadow: "inset -2px 0 3px rgba(0,0,0,0.25)",
            }}
          />
          {/* elastic closure band near the right edge */}
          <span
            className="absolute inset-y-0 right-5 w-1.5"
            style={{
              background: "rgba(0,0,0,0.18)",
              boxShadow: "0 0 1px rgba(255,255,255,0.15)",
            }}
          />
          {/* subtle inner emboss */}
          <span
            className="pointer-events-none absolute inset-2 rounded-md"
            style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
          />
        </div>
      </Link>

      {/* topic label — hidden until hover/focus */}
      <p className="mt-3 text-center font-sans text-sm text-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
        {notebook.topic}
      </p>
    </li>
  );
}
