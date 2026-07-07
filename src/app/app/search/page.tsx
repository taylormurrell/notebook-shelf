import Link from "next/link";
import { search } from "@/lib/search";
import { SearchBox } from "@/components/search-box";
import { Highlight } from "@/components/highlight";

const KIND_LABEL: Record<string, string> = {
  notebook: "Notebook",
  note: "Note",
  link: "Link",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const results = query ? await search(query) : [];

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <header className="flex items-center justify-between">
          <Link
            href="/app"
            className="font-sans text-sm text-accent underline underline-offset-2"
          >
            ← Back to shelf
          </Link>
        </header>

        <h1 className="mt-6 font-serif text-3xl text-foreground">Search</h1>
        <div className="mt-4">
          <SearchBox initial={query} autoFocus />
        </div>

        {!query && (
          <p className="mt-8 font-sans text-sm text-muted">
            Search across your notebooks, notes, and links.
          </p>
        )}

        {query && results.length === 0 && (
          <p className="mt-8 font-sans text-sm text-muted">
            No matches for “{query}”.
          </p>
        )}

        {results.length > 0 && (
          <ul className="mt-8 flex flex-col gap-3">
            {results.map((r, i) => {
              const href =
                r.kind === "notebook"
                  ? `/app/notebooks/${r.notebookId}`
                  : `/app/notebooks/${r.notebookId}?note=${r.noteId}`;
              return (
                <li key={`${r.kind}-${r.noteId ?? r.notebookId}-${i}`}>
                  <Link
                    href={href}
                    className="block rounded-2xl border border-border bg-panel p-4 transition hover:bg-background"
                  >
                    <div className="flex items-center gap-2 font-sans text-xs text-muted">
                      <span className="rounded-full bg-background px-2 py-0.5">
                        {KIND_LABEL[r.kind]}
                        {r.kind === "link" && r.sourceType === "youtube"
                          ? " · YouTube"
                          : ""}
                      </span>
                      <span className="truncate">{r.notebookTopic}</span>
                    </div>
                    <p className="mt-1.5 font-sans text-sm text-foreground">
                      <Highlight text={r.snippet} query={query} />
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
