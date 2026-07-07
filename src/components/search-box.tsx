"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SearchBox({
  initial = "",
  autoFocus = false,
}: {
  initial?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = q.trim();
    if (t) router.push(`/app/search?q=${encodeURIComponent(t)}`);
  }

  return (
    <form onSubmit={submit} className="relative w-full max-w-md">
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
      >
        ⌕
      </span>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus={autoFocus}
        placeholder="Search notes, links, notebooks…"
        aria-label="Search"
        className="w-full rounded-full border border-border bg-panel py-2 pl-9 pr-4 font-sans text-sm text-foreground outline-none focus:border-accent"
      />
    </form>
  );
}
