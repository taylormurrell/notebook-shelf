import type { CoverColor, PageColor, FontStyle } from "@/lib/notebook-styles";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createClient } from "@/lib/supabase/server";

export type Notebook = {
  id: string;
  topic: string;
  coverColor: CoverColor;
  pageColor: PageColor;
  fontStyle: FontStyle;
};

type Row = {
  id: string;
  topic: string;
  cover_color: string;
  page_color: string;
  font_style: string;
};

const SELECT = "id, topic, cover_color, page_color, font_style";

function toNotebook(r: Row): Notebook {
  return {
    id: r.id,
    topic: r.topic,
    coverColor: r.cover_color as CoverColor,
    pageColor: r.page_color as PageColor,
    fontStyle: r.font_style as FontStyle,
  };
}

// Returns the current user's notebooks. RLS guarantees only their own rows come
// back, so there's no user_id filter here — the policy does the scoping.
export async function getNotebooks(): Promise<Notebook[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notebooks")
    .select(SELECT)
    .order("created_at", { ascending: true });
  if (error) {
    // 42P01 = table doesn't exist yet (migration not run). Show an empty shelf
    // instead of crashing; any other error is a real problem, so rethrow it.
    if (error.code === "42P01") return [];
    throw new Error(error.message);
  }
  return (data ?? []).map(toNotebook);
}

// Returns a single notebook, or null if it doesn't exist or isn't owned by the
// current user (RLS returns no row in that case).
export async function getNotebook(id: string): Promise<Notebook | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notebooks")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    if (error.code === "42P01") return null; // table not created yet
    throw new Error(error.message);
  }
  return data ? toNotebook(data as Row) : null;
}
