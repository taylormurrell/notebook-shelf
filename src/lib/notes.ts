import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createClient } from "@/lib/supabase/server";
import { LINK_SELECT, rowToLink, type LinkRecord } from "@/lib/links";
import { TAB_SELECT, rowToTab, type StickyTab } from "@/lib/sticky-tabs";

export type Note = {
  id: string;
  content: string;
  links: LinkRecord[];
  tabs: StickyTab[];
};

type Client = Awaited<ReturnType<typeof createClient>>;

// Fetch links for a set of note ids, grouped by note id. Degrades to an empty
// map if the links table doesn't exist yet (Module 6 migration not run).
async function fetchLinksByNote(
  supabase: Client,
  noteIds: string[],
): Promise<Map<string, LinkRecord[]>> {
  const map = new Map<string, LinkRecord[]>();
  if (noteIds.length === 0) return map;
  const { data, error } = await supabase
    .from("links")
    .select(LINK_SELECT)
    .in("note_id", noteIds)
    .order("created_at", { ascending: true });
  if (error) return map;
  for (const row of data ?? []) {
    const link = rowToLink(row);
    const arr = map.get(link.noteId) ?? [];
    arr.push(link);
    map.set(link.noteId, arr);
  }
  return map;
}

// Fetch sticky tabs for a set of note ids, grouped by note id. Degrades to an
// empty map if the sticky_tabs table doesn't exist yet (Module 7 not run).
async function fetchTabsByNote(
  supabase: Client,
  noteIds: string[],
): Promise<Map<string, StickyTab[]>> {
  const map = new Map<string, StickyTab[]>();
  if (noteIds.length === 0) return map;
  const { data, error } = await supabase
    .from("sticky_tabs")
    .select(TAB_SELECT)
    .in("note_id", noteIds)
    .order("created_at", { ascending: true });
  if (error) return map;
  for (const row of data ?? []) {
    const tab = rowToTab(row);
    const arr = map.get(tab.noteId) ?? [];
    arr.push(tab);
    map.set(tab.noteId, arr);
  }
  return map;
}

// Notes for a notebook (with their links), ordered by position_index.
// RLS scopes everything to the current user.
export async function getNotes(notebookId: string): Promise<Note[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("id, content, position_index")
    .eq("notebook_id", notebookId)
    .order("position_index", { ascending: true });
  if (error) {
    if (error.code === "42P01") return []; // notes table not created yet
    throw new Error(error.message);
  }
  const rows = data ?? [];
  const noteIds = rows.map((r) => r.id);
  const [linksByNote, tabsByNote] = await Promise.all([
    fetchLinksByNote(supabase, noteIds),
    fetchTabsByNote(supabase, noteIds),
  ]);
  return rows.map((r) => ({
    id: r.id,
    content: r.content,
    links: linksByNote.get(r.id) ?? [],
    tabs: tabsByNote.get(r.id) ?? [],
  }));
}
