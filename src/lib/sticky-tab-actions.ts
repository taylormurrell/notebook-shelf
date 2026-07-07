"use server";

import { createClient } from "@/lib/supabase/server";
import { rowToTab, TAB_SELECT, type StickyTab } from "@/lib/sticky-tabs";
import { TAB_COLOR_KEYS, type TabColor } from "@/lib/notebook-styles";

export type CreateTabResult = { tab: StickyTab } | { error: string };

export async function createStickyTab(
  notebookId: string,
  noteId: string,
  color: string,
  label: string,
): Promise<CreateTabResult> {
  if (!TAB_COLOR_KEYS.includes(color as TabColor)) {
    return { error: "Invalid tab color." };
  }
  const trimmed = label.trim().slice(0, 40); // label is untrusted; keep it short

  const supabase = await createClient();
  // user_id filled by column default; WITH CHECK verifies note ownership.
  const { data, error } = await supabase
    .from("sticky_tabs")
    .insert({
      notebook_id: notebookId,
      note_id: noteId,
      color,
      label: trimmed || null,
    })
    .select(TAB_SELECT)
    .single();
  if (error) return { error: error.message };

  return { tab: rowToTab(data) };
}

export async function deleteStickyTab(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("sticky_tabs").delete().eq("id", id);
}
