// Pure types/helpers for sticky tabs. No server imports, so client components
// can use these too.

export type StickyTab = {
  id: string;
  noteId: string;
  color: string;
  label: string | null;
};

type TabRow = {
  id: string;
  note_id: string;
  color: string;
  label: string | null;
};

export const TAB_SELECT = "id, note_id, color, label";

export function rowToTab(r: TabRow): StickyTab {
  return { id: r.id, noteId: r.note_id, color: r.color, label: r.label };
}
