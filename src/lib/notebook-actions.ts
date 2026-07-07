"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  COVER_COLOR_KEYS,
  PAGE_COLOR_KEYS,
  FONT_KEYS,
  type CoverColor,
  type PageColor,
  type FontStyle,
} from "@/lib/notebook-styles";

export type NotebookInput = {
  topic: string;
  coverColor: string;
  pageColor: string;
  fontStyle: string;
};

export type ActionResult = { ok: true } | { error: string };

// Validate + narrow untrusted client input against the curated token sets.
function parse(input: NotebookInput):
  | { ok: true; value: { topic: string; coverColor: CoverColor; pageColor: PageColor; fontStyle: FontStyle } }
  | { ok: false; error: string } {
  const topic = input.topic.trim();
  if (!topic) return { ok: false, error: "Please give the notebook a topic." };
  if (topic.length > 120)
    return { ok: false, error: "Topic is too long (max 120 characters)." };
  if (!COVER_COLOR_KEYS.includes(input.coverColor as CoverColor))
    return { ok: false, error: "Invalid cover color." };
  if (!PAGE_COLOR_KEYS.includes(input.pageColor as PageColor))
    return { ok: false, error: "Invalid page color." };
  if (!FONT_KEYS.includes(input.fontStyle as FontStyle))
    return { ok: false, error: "Invalid font." };
  return {
    ok: true,
    value: {
      topic,
      coverColor: input.coverColor as CoverColor,
      pageColor: input.pageColor as PageColor,
      fontStyle: input.fontStyle as FontStyle,
    },
  };
}

export async function createNotebook(input: NotebookInput): Promise<ActionResult> {
  const parsed = parse(input);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  // user_id is filled by the column default (auth.uid()); we never send it.
  const { error } = await supabase.from("notebooks").insert({
    topic: parsed.value.topic,
    cover_color: parsed.value.coverColor,
    page_color: parsed.value.pageColor,
    font_style: parsed.value.fontStyle,
    line_style: "college_ruled",
  });
  if (error) return { error: error.message };

  revalidatePath("/app");
  return { ok: true };
}

export async function updateNotebook(
  id: string,
  input: NotebookInput,
): Promise<ActionResult> {
  const parsed = parse(input);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notebooks")
    .update({
      topic: parsed.value.topic,
      cover_color: parsed.value.coverColor,
      page_color: parsed.value.pageColor,
      font_style: parsed.value.fontStyle,
    })
    .eq("id", id); // RLS also restricts this to the owner
  if (error) return { error: error.message };

  revalidatePath("/app");
  revalidatePath(`/app/notebooks/${id}`);
  return { ok: true };
}

export async function deleteNotebook(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("notebooks").delete().eq("id", id);
  revalidatePath("/app");
  redirect("/app");
}
