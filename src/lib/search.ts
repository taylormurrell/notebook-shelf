import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createClient } from "@/lib/supabase/server";

export type SearchResult = {
  kind: "notebook" | "note" | "link";
  notebookId: string;
  notebookTopic: string;
  noteId?: string;
  snippet: string;
  sourceType?: string;
  url?: string;
};

// Make %, _ and \ literal so a user typing them isn't treated as ilike wildcards.
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => "\\" + m);
}

// A short window of text around the first match.
function snippet(content: string, q: string): string {
  const text = content.replace(/\s+/g, " ").trim();
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text.slice(0, 120);
  const start = Math.max(0, i - 40);
  const end = Math.min(text.length, i + q.length + 80);
  return (
    (start > 0 ? "…" : "") +
    text.slice(start, end) +
    (end < text.length ? "…" : "")
  );
}

// Search the current user's notebooks, notes, and links. RLS scopes every query
// to the signed-in user, so results can never include anyone else's data. The
// query value is always passed as a parameter (never interpolated into SQL).
// Simple ilike search for MVP; can move notes to full-text search (search_vector
// is already in place) later if needed.
export async function search(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q || !isSupabaseConfigured) return [];

  const supabase = await createClient();
  const like = `%${escapeLike(q)}%`;
  const lower = q.toLowerCase();
  const results: SearchResult[] = [];

  // All of the user's notebooks (for topic matches + topic lookup).
  const { data: notebooks } = await supabase
    .from("notebooks")
    .select("id, topic");
  const topicById = new Map((notebooks ?? []).map((n) => [n.id, n.topic]));

  for (const n of notebooks ?? []) {
    if (n.topic.toLowerCase().includes(lower)) {
      results.push({
        kind: "notebook",
        notebookId: n.id,
        notebookTopic: n.topic,
        snippet: n.topic,
      });
    }
  }

  // Note content matches.
  const { data: notes } = await supabase
    .from("notes")
    .select("id, content, notebook_id")
    .ilike("content", like)
    .limit(50);
  for (const nt of notes ?? []) {
    results.push({
      kind: "note",
      notebookId: nt.notebook_id,
      notebookTopic: topicById.get(nt.notebook_id) ?? "Notebook",
      noteId: nt.id,
      snippet: snippet(nt.content, q),
    });
  }

  // Link matches — url or title. Two safe ilike queries, merged (avoids
  // interpolating the query into an .or() filter string).
  const [{ data: byUrl }, { data: byTitle }] = await Promise.all([
    supabase
      .from("links")
      .select("id, url, title, source_type, note_id")
      .ilike("url", like)
      .limit(50),
    supabase
      .from("links")
      .select("id, url, title, source_type, note_id")
      .ilike("title", like)
      .limit(50),
  ]);
  type LinkHit = {
    id: string;
    url: string;
    title: string | null;
    source_type: string;
    note_id: string;
  };
  const linkById = new Map<string, LinkHit>();
  for (const l of [...(byUrl ?? []), ...(byTitle ?? [])]) linkById.set(l.id, l);
  const links = [...linkById.values()];

  if (links.length > 0) {
    const noteIds = [...new Set(links.map((l) => l.note_id))];
    const { data: linkNotes } = await supabase
      .from("notes")
      .select("id, notebook_id")
      .in("id", noteIds);
    const nbByNote = new Map(
      (linkNotes ?? []).map((n) => [n.id, n.notebook_id]),
    );
    for (const l of links) {
      const nbId = nbByNote.get(l.note_id);
      if (!nbId) continue;
      results.push({
        kind: "link",
        notebookId: nbId,
        notebookTopic: topicById.get(nbId) ?? "Notebook",
        noteId: l.note_id,
        snippet: l.title ?? l.url,
        sourceType: l.source_type,
        url: l.url,
      });
    }
  }

  return results;
}
