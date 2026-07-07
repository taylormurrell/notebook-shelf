"use client";

import { useState } from "react";
import { TAB_COLORS, TAB_COLOR_KEYS, type TabColor } from "@/lib/notebook-styles";

// Per-note "add tab" control (the color/label picker). Existing tabs are shown
// as bookmarks poking out the side of the page, handled in the editor.
export function NoteTabs({
  noteId,
  onCreate,
}: {
  noteId: string;
  onCreate: (noteId: string, color: TabColor, label: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState<TabColor>(TAB_COLOR_KEYS[0]);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    await onCreate(noteId, color, label);
    setBusy(false);
    setLabel("");
    setColor(TAB_COLOR_KEYS[0]);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-full border border-border bg-panel px-2 py-0.5 font-sans text-xs text-muted transition hover:text-accent"
      >
        🔖 add tab
      </button>

      {open && (
          <div className="absolute right-0 z-20 mt-1 w-60 rounded-xl border border-border bg-panel p-3 shadow-lg">
            <div className="flex flex-wrap gap-2">
              {TAB_COLOR_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setColor(k)}
                  title={`${TAB_COLORS[k].label} — ${TAB_COLORS[k].meaning}`}
                  aria-label={`${TAB_COLORS[k].label} (${TAB_COLORS[k].meaning})`}
                  aria-pressed={color === k}
                  className={`h-6 w-6 rounded-full transition ${
                    color === k
                      ? "ring-2 ring-foreground ring-offset-1 ring-offset-panel"
                      : "ring-1 ring-black/10"
                  }`}
                  style={{ background: TAB_COLORS[k].hex }}
                />
              ))}
            </div>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={40}
              placeholder="Label (optional)"
              className="mt-2 w-full rounded-lg border border-border bg-background px-2 py-1 font-sans text-sm text-foreground outline-none focus:border-accent"
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="font-sans text-xs text-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={add}
                disabled={busy}
                className="rounded-full bg-foreground px-3 py-1 font-sans text-xs text-background transition hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Adding…" : "Add tab"}
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
