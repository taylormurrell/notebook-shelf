"use server";

import { createClient } from "@/lib/supabase/server";
import {
  extractSafeUrls,
  parseYouTube,
  rowToLink,
  LINK_SELECT,
  type LinkRecord,
} from "@/lib/links";

// Note content is untrusted text. It is stored and rendered as plain text only
// (never HTML) and is never logged.

// Generous cap so real notes are never truncated, but unbounded rows are
// rejected — protects storage and the generated search_vector column, which
// has its own internal size limit that otherwise surfaces as a confusing error.
const MAX_NOTE_LENGTH = 50_000;

type Client = Awaited<ReturnType<typeof createClient>>;

export type CreateNoteResult = { id: string; links: LinkRecord[] } | { error: string };
export type UpdateNoteResult = { ok: true; links: LinkRecord[] } | { error: string };

// Table-missing errors (Module 6 migration not run yet) are expected and
// silently degrade to "no links". Anything else is unexpected and gets logged
// by error code only (never the note content) so real failures — e.g. an RLS
// policy rejecting the insert — aren't hidden.
function isMissingTable(error: { code?: string } | null): boolean {
  return error?.code === "42P01";
}

// Reconcile the links table for a note against the URLs currently in its
// content: delete links that were removed, insert links that were added,
// classify YouTube links. Metadata only — no scraping, no HTML. Degrades to []
// if the links table doesn't exist yet, so note saving still works.
async function syncLinks(
  supabase: Client,
  noteId: string,
  content: string,
): Promise<LinkRecord[]> {
  try {
    const urls = extractSafeUrls(content);
    const { data: existingData, error: selectError } = await supabase
      .from("links")
      .select("id, url")
      .eq("note_id", noteId);
    if (selectError) {
      if (!isMissingTable(selectError)) {
        console.error("syncLinks: select failed", selectError.code);
      }
      return [];
    }
    const existing = existingData ?? [];
    const existingUrls = new Set(existing.map((l) => l.url));
    const desired = new Set(urls);

    const toDelete = existing.filter((l) => !desired.has(l.url)).map((l) => l.id);
    if (toDelete.length) {
      const { error } = await supabase.from("links").delete().in("id", toDelete);
      if (error) console.error("syncLinks: delete failed", error.code);
    }

    const toInsert = urls
      .filter((u) => !existingUrls.has(u))
      .map((u) => {
        const yt = parseYouTube(u);
        return yt
          ? {
              note_id: noteId,
              url: u,
              source_type: "youtube",
              youtube_video_id: yt.videoId,
              youtube_timestamp_seconds: yt.timestampSeconds,
            }
          : { note_id: noteId, url: u, source_type: "url" };
      });
    if (toInsert.length) {
      const { error } = await supabase.from("links").insert(toInsert);
      if (error) console.error("syncLinks: insert failed", error.code);
    }

    const { data, error: finalError } = await supabase
      .from("links")
      .select(LINK_SELECT)
      .eq("note_id", noteId)
      .order("created_at", { ascending: true });
    if (finalError) {
      if (!isMissingTable(finalError)) {
        console.error("syncLinks: refetch failed", finalError.code);
      }
      return [];
    }
    return (data ?? []).map(rowToLink);
  } catch (e) {
    console.error("syncLinks: unexpected error", e instanceof Error ? e.message : e);
    return [];
  }
}

export async function createNote(
  notebookId: string,
  content: string,
): Promise<CreateNoteResult> {
  if (content.length > MAX_NOTE_LENGTH) {
    return { error: "Note is too long." };
  }
  const supabase = await createClient();

  const { data: last, error: lastError } = await supabase
    .from("notes")
    .select("position_index")
    .eq("notebook_id", notebookId)
    .order("position_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) return { error: lastError.message };

  const nextIndex = (last?.position_index ?? -1) + 1;

  const { data, error } = await supabase
    .from("notes")
    .insert({ notebook_id: notebookId, content, position_index: nextIndex })
    .select("id")
    .single();
  if (error) return { error: error.message };

  const links = await syncLinks(supabase, data.id, content);
  return { id: data.id, links };
}

export async function updateNote(
  id: string,
  content: string,
): Promise<UpdateNoteResult> {
  if (content.length > MAX_NOTE_LENGTH) {
    return { error: "Note is too long." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("notes")
    .update({ content })
    .eq("id", id);
  if (error) return { error: error.message };

  const links = await syncLinks(supabase, id, content);
  return { ok: true, links };
}

// Delete a note (its links cascade). Used when merging a note into the one
// above it. RLS restricts this to the owner.
export async function deleteNote(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("notes").delete().eq("id", id);
}
