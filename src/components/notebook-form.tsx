"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  COVER_COLORS,
  PAGE_COLORS,
  FONTS,
  COVER_COLOR_KEYS,
  PAGE_COLOR_KEYS,
  FONT_KEYS,
  DEFAULT_COVER_COLOR,
  type CoverColor,
} from "@/lib/notebook-styles";
import {
  createNotebook,
  updateNotebook,
  type NotebookInput,
} from "@/lib/notebook-actions";

type Initial = {
  id: string;
  topic: string;
  coverColor: string;
  pageColor: string;
  fontStyle: string;
};

export function NotebookForm({
  mode,
  initial,
  onDone,
}: {
  mode: "create" | "edit";
  initial?: Initial;
  onDone: () => void;
}) {
  const router = useRouter();
  const [topic, setTopic] = useState(initial?.topic ?? "");
  const [coverColor, setCoverColor] = useState(() =>
    initial && COVER_COLOR_KEYS.includes(initial.coverColor as CoverColor)
      ? initial.coverColor
      : DEFAULT_COVER_COLOR,
  );
  const [pageColor, setPageColor] = useState(initial?.pageColor ?? "page_ivory");
  const [fontStyle, setFontStyle] = useState(initial?.fontStyle ?? "font_serif_warm");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input: NotebookInput = { topic, coverColor, pageColor, fontStyle };
    startTransition(async () => {
      const res =
        mode === "create"
          ? await createNotebook(input)
          : await updateNotebook(initial!.id, input);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      router.refresh();
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <h2 className="font-serif text-2xl text-foreground">
        {mode === "create" ? "New notebook" : "Edit notebook"}
      </h2>

      <label className="flex flex-col gap-1">
        <span className="font-sans text-sm text-foreground">Topic</span>
        <input
          type="text"
          required
          maxLength={120}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Reading notes"
          className="rounded-xl border border-border bg-background px-4 py-2.5 font-sans text-sm text-foreground outline-none focus:border-accent"
        />
        <span className="font-sans text-xs text-muted">
          Shown on hover and inside the notebook — never on the cover.
        </span>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-sans text-sm text-foreground">Cover color</legend>
        <div className="flex flex-wrap gap-2">
          {COVER_COLOR_KEYS.map((key) => {
            const c = COVER_COLORS[key];
            const selected = coverColor === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setCoverColor(key)}
                title={c.label}
                aria-label={c.label}
                aria-pressed={selected}
                className={`h-9 w-9 rounded-md transition ${
                  selected
                    ? "ring-2 ring-foreground ring-offset-2 ring-offset-panel"
                    : "ring-1 ring-black/10"
                }`}
                style={{
                  background: `linear-gradient(135deg, ${c.sheen}, ${c.dark})`,
                }}
              />
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-sans text-sm text-foreground">Page color</legend>
        <div className="flex flex-wrap gap-2">
          {PAGE_COLOR_KEYS.map((key) => {
            const p = PAGE_COLORS[key];
            const selected = pageColor === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPageColor(key)}
                title={p.label}
                aria-label={p.label}
                aria-pressed={selected}
                className={`h-9 w-9 rounded-md transition ${
                  selected
                    ? "ring-2 ring-foreground ring-offset-2 ring-offset-panel"
                    : "ring-1 ring-black/10"
                }`}
                style={{ background: p.hex }}
              />
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-sans text-sm text-foreground">Font</legend>
        <div className="flex flex-col gap-2">
          {FONT_KEYS.map((key) => {
            const f = FONTS[key];
            const selected = fontStyle === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFontStyle(key)}
                aria-pressed={selected}
                className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-left transition ${
                  selected
                    ? "border-accent bg-background"
                    : "border-border hover:border-accent"
                }`}
              >
                <span className="font-sans text-sm text-foreground">
                  {f.label}
                </span>
                <span
                  className="text-base text-foreground"
                  style={{ fontFamily: f.css }}
                >
                  The quick brown fox
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="font-sans text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-1 flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-full border border-border bg-panel px-4 py-2 font-sans text-sm text-foreground transition hover:bg-background"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-foreground px-5 py-2 font-sans text-sm text-background transition hover:opacity-90 disabled:opacity-50"
        >
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Create notebook"
              : "Save changes"}
        </button>
      </div>
    </form>
  );
}
