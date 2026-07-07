"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  PAGE_COLORS,
  FONTS,
  TAB_COLORS,
  coverStyle,
  type PageColor,
  type FontStyle,
  type CoverColor,
  type TabColor,
} from "@/lib/notebook-styles";
import type { Note } from "@/lib/notes";
import type { LinkRecord } from "@/lib/links";
import type { StickyTab } from "@/lib/sticky-tabs";
import { createNote, updateNote, deleteNote } from "@/lib/note-actions";
import { createStickyTab, deleteStickyTab } from "@/lib/sticky-tab-actions";
import { LinkCard } from "@/components/link-card";
import { NoteTabs } from "@/components/note-tabs";

const LINE_HEIGHT = 34; // px per ruled line
const PAGE_LINES = 15; // lines visible per "page"
const PAGE_HEIGHT = LINE_HEIGHT * PAGE_LINES;
const MARGIN_LEFT = 52; // gutter to the right of the margin rule
const INK = "#2b2622";

// Faint paper grain layered under the ruled lines.
const PAPER_GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")";

type Block = {
  key: string;
  id: string | null;
  content: string;
  links: LinkRecord[];
  tabs: StickyTab[];
};
type SaveState = "idle" | "saving" | "saved" | "error";

function emptyBlock(): Block {
  return { key: crypto.randomUUID(), id: null, content: "", links: [], tabs: [] };
}

// Render note text with URLs as inline chips. Only paint (color/background)
// changes — no font/padding change — so widths match the textarea exactly and
// the chip stays aligned with the caret. Renders as React text/elements (never
// dangerouslySetInnerHTML), so it's safe with untrusted content.
function renderNoteText(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /\bhttps?:\/\/[^\s<>"']+/gi;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const start = m.index;
    const raw = m[0];
    if (start > last) nodes.push(text.slice(last, start));
    const trail = raw.match(/[.,);\]]+$/);
    const trailing = trail ? trail[0] : "";
    const url = trailing ? raw.slice(0, raw.length - trailing.length) : raw;
    nodes.push(
      <span
        key={key++}
        style={{
          color: "#2f6f76",
          textDecoration: "underline",
          textDecorationColor: "rgba(47,111,118,0.45)",
          textUnderlineOffset: "2px",
        }}
      >
        {url}
      </span>,
    );
    if (trailing) nodes.push(trailing);
    last = start + raw.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

// One auto-growing, line-aligned note block. Height snaps to the nearest
// multiple of the line height (round, not ceil) so the ruled lines stay aligned.
// A backdrop layer mirrors the text and styles URLs; the textarea on top has
// transparent text so only the backdrop shows.
function NoteArea({
  noteKey,
  value,
  fontCss,
  autoFocus,
  registerRef,
  onChange,
  onBlur,
  onBackspaceAtStart,
}: {
  noteKey: string;
  value: string;
  fontCss: string;
  autoFocus: boolean;
  registerRef: (key: string, el: HTMLTextAreaElement | null) => void;
  onChange: (v: string) => void;
  onBlur: () => void;
  onBackspaceAtStart: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const rows = Math.max(1, Math.round(el.scrollHeight / LINE_HEIGHT));
    el.style.height = `${rows * LINE_HEIGHT}px`;
  }, []);

  const setRef = useCallback(
    (el: HTMLTextAreaElement | null) => {
      ref.current = el;
      registerRef(noteKey, el);
    },
    [noteKey, registerRef],
  );

  useEffect(() => {
    fit();
  }, [value, fit]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    if (e.key === "Backspace" && el.selectionStart === 0 && el.selectionEnd === 0) {
      e.preventDefault();
      onBackspaceAtStart();
    }
  }

  const typography: React.CSSProperties = {
    fontFamily: fontCss,
    fontSize: "18px",
    lineHeight: `${LINE_HEIGHT}px`,
    overflowWrap: "break-word",
  };

  return (
    <div className="relative">
      {/* backdrop: shows the text + styled URL chips */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          ...typography,
          color: INK,
          whiteSpace: "pre-wrap",
          margin: 0,
          padding: 0,
        }}
      >
        {renderNoteText(value)}
      </div>

      {/* textarea on top: transparent text, visible caret */}
      <textarea
        ref={setRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
        rows={1}
        spellCheck
        aria-label="Note"
        className="relative z-10 block w-full resize-none border-0 bg-transparent p-0 outline-none"
        style={{
          ...typography,
          color: "transparent",
          caretColor: "#7c6f5b",
          overflow: "hidden",
        }}
      />
    </div>
  );
}

export function NotebookEditor({
  notebookId,
  coverColor,
  pageColor,
  fontStyle,
  initialNotes,
  focusNoteId,
}: {
  notebookId: string;
  coverColor: CoverColor;
  pageColor: PageColor;
  fontStyle: FontStyle;
  initialNotes: Note[];
  focusNoteId?: string;
}) {
  const fontCss = FONTS[fontStyle].css;
  const pageHex = PAGE_COLORS[pageColor].hex;
  const cover = coverStyle(coverColor);

  const [blocks, setBlocks] = useState<Block[]>(() =>
    initialNotes.length > 0
      ? initialNotes.map((n) => ({
          key: n.id,
          id: n.id,
          content: n.content,
          links: n.links,
          tabs: n.tabs,
        }))
      : [emptyBlock()],
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [focusKey, setFocusKey] = useState<string | null>(null);

  const paperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const blocksRef = useRef(blocks);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const textareas = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const restoreToRef = useRef<number | null>(null);

  const pageKey = `nbshelf:page:${notebookId}`;

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  const registerRef = useCallback(
    (key: string, el: HTMLTextAreaElement | null) => {
      if (el) textareas.current.set(key, el);
      else textareas.current.delete(key);
    },
    [],
  );

  const flushSave = useCallback(
    async (key: string) => {
      const block = blocksRef.current.find((b) => b.key === key);
      if (!block) return;
      const content = block.content;
      if (block.id === null && content.trim() === "") return;

      setSaveState("saving");
      try {
        if (block.id === null) {
          const res = await createNote(notebookId, content);
          if ("error" in res) {
            setSaveState("error");
            return;
          }
          const { id: newId, links } = res;
          setBlocks((prev) =>
            prev.map((b) => (b.key === key ? { ...b, id: newId, links } : b)),
          );
        } else {
          const res = await updateNote(block.id, content);
          if ("error" in res) {
            setSaveState("error");
            return;
          }
          const { links } = res;
          setBlocks((prev) =>
            prev.map((b) => (b.key === key ? { ...b, links } : b)),
          );
        }
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    },
    [notebookId],
  );

  const scheduleSave = useCallback(
    (key: string) => {
      const existing = timers.current.get(key);
      if (existing) clearTimeout(existing);
      timers.current.set(
        key,
        setTimeout(() => flushSave(key), 800),
      );
    },
    [flushSave],
  );

  function handleChange(key: string, value: string) {
    setBlocks((prev) =>
      prev.map((b) => (b.key === key ? { ...b, content: value } : b)),
    );
    setSaveState("idle");
    scheduleSave(key);
  }

  function handleBlur(key: string) {
    const t = timers.current.get(key);
    if (t) clearTimeout(t);
    flushSave(key);
  }

  function addNote() {
    const b = emptyBlock();
    setBlocks((prev) => [...prev, b]);
    setFocusKey(b.key);
  }

  // Delete an entire note. Its links + tabs cascade in the database.
  function deleteBlock(key: string) {
    const block = blocksRef.current.find((b) => b.key === key);
    if (!block) return;
    const t = timers.current.get(key);
    if (t) clearTimeout(t);
    timers.current.delete(key);
    setBlocks((prev) => {
      const next = prev.filter((b) => b.key !== key);
      return next.length > 0 ? next : [emptyBlock()];
    });
    if (block.id) deleteNote(block.id);
  }

  async function handleCreateTab(
    noteId: string,
    color: TabColor,
    label: string,
  ) {
    const res = await createStickyTab(notebookId, noteId, color, label);
    if ("error" in res) return;
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === noteId ? { ...b, tabs: [...b.tabs, res.tab] } : b,
      ),
    );
  }

  function handleRemoveTab(tabId: string) {
    setBlocks((prev) =>
      prev.map((b) => ({ ...b, tabs: b.tabs.filter((t) => t.id !== tabId) })),
    );
    deleteStickyTab(tabId);
  }

  // Backspace at the start of a note merges it into the note above it.
  function mergeIntoPrevious(key: string) {
    const cur = blocksRef.current;
    const idx = cur.findIndex((b) => b.key === key);
    if (idx <= 0) return;
    const prevBlock = cur[idx - 1];
    const curBlock = cur[idx];
    const caret = prevBlock.content.length;
    const mergedContent = prevBlock.content + curBlock.content;

    const t = timers.current.get(curBlock.key);
    if (t) clearTimeout(t);
    timers.current.delete(curBlock.key);

    setBlocks((prev) =>
      prev
        .filter((b) => b.key !== curBlock.key)
        .map((b) =>
          b.key === prevBlock.key ? { ...b, content: mergedContent } : b,
        ),
    );

    requestAnimationFrame(() => {
      const el = textareas.current.get(prevBlock.key);
      if (el) {
        el.focus();
        el.setSelectionRange(caret, caret);
      }
    });

    if (curBlock.id) deleteNote(curBlock.id);
    scheduleSave(prevBlock.key);
  }

  // Scroll a note into view (used by the side tabs).
  function jumpToBlock(key: string) {
    const el = textareas.current.get(key);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  const taggedBlocks = blocks.flatMap((b) =>
    b.tabs.map((tab) => ({ tab, blockKey: b.key, content: b.content })),
  );

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const measure = () =>
      setPageCount(Math.max(1, Math.ceil(content.scrollHeight / PAGE_HEIGHT)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(content);
    return () => ro.disconnect();
  }, [blocks]);

  const goTo = useCallback(
    (page: number) => {
      const el = paperRef.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(page, pageCount - 1));
      setCurrentPage(clamped);
      el.scrollTo({ top: clamped * PAGE_HEIGHT, behavior: "smooth" });
    },
    [pageCount],
  );

  // Arrow-key page navigation — only when not typing in the editor.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT")) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(currentPage + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(currentPage - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentPage, goTo]);

  function onScroll() {
    const el = paperRef.current;
    if (!el) return;
    setCurrentPage(Math.round(el.scrollTop / PAGE_HEIGHT));
  }

  // Arriving from a search result: scroll the matched note into view.
  useEffect(() => {
    if (!focusNoteId) return;
    requestAnimationFrame(() => {
      const el = textareas.current.get(focusNoteId);
      el?.scrollIntoView({ block: "center" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On open: load dog-ears, and remember the page we left off on (the ribbon).
  // Reading localStorage in an effect avoids a hydration mismatch.
  useEffect(() => {
    try {
      if (!focusNoteId) {
        const saved = localStorage.getItem(pageKey);
        if (saved) {
          const p = parseInt(saved, 10);
          if (p > 0) restoreToRef.current = p;
        }
      }
    } catch {
      // ignore storage errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once enough pages exist, jump to the remembered page (the ribbon spot).
  useEffect(() => {
    if (restoreToRef.current == null) return;
    if (pageCount - 1 >= restoreToRef.current) {
      goTo(restoreToRef.current);
      restoreToRef.current = null;
    }
  }, [pageCount, goTo]);

  // Persist the current page so reopening lands you where you left off.
  useEffect(() => {
    try {
      localStorage.setItem(pageKey, String(currentPage));
    } catch {
      // ignore
    }
  }, [currentPage, pageKey]);


  const linedBg = `repeating-linear-gradient(to bottom, transparent 0, transparent ${
    LINE_HEIGHT - 1
  }px, rgba(0,0,0,0.07) ${LINE_HEIGHT - 1}px, rgba(0,0,0,0.07) ${LINE_HEIGHT}px)`;

  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Couldn’t save — check your connection"
          : "";

  return (
    <div className="relative">
      {/* tab review tiles — jump to any tabbed note */}
      {taggedBlocks.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="font-sans text-xs text-muted">Tabs:</span>
          {taggedBlocks.map(({ tab, blockKey, content }) => {
            const c = TAB_COLORS[tab.color as TabColor];
            return (
              <span
                key={tab.id}
                className="inline-flex max-w-[18rem] items-center gap-1.5 rounded-full border border-border bg-panel py-1 pl-2.5 pr-1 font-sans text-xs"
              >
                <button
                  type="button"
                  onClick={() => jumpToBlock(blockKey)}
                  className="inline-flex min-w-0 items-center gap-1.5 transition hover:opacity-70"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: c?.hex ?? "#cccccc" }}
                  />
                  <span className="shrink-0 text-foreground">
                    {tab.label ?? c?.meaning ?? "Tab"}
                  </span>
                  {content.trim() && (
                    <span className="truncate text-muted">
                      — {content.trim().slice(0, 40)}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveTab(tab.id)}
                  aria-label="Remove tab"
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-background hover:text-foreground"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* notebook cover showing behind the page */}
      <div
        className="book-open relative rounded-xl py-2 pl-2.5 pr-2 shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${cover.sheen} 0%, ${cover.base} 50%, ${cover.dark} 100%)`,
        }}
      >
        {/* ribbon bookmark — drapes deeper the further into the notebook you are */}
        <div
          className="pointer-events-none absolute top-0 z-10"
          style={{ right: 30 }}
          aria-hidden
        >
          <div
            style={{
              width: 16,
              height: 52,
              background:
                "linear-gradient(90deg, #6f1d29 0%, #a8324a 45%, #7c2233 100%)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.35)",
            }}
          />
          <div
            style={{
              width: 16,
              height: 11,
              background: "#7c2233",
              clipPath: "polygon(0 0, 100% 0, 50% 100%)",
            }}
          />
        </div>

        {/* the paper */}
        <div
          ref={paperRef}
          onScroll={onScroll}
          className="overflow-y-auto rounded-md ring-1 ring-black/10"
          style={{ height: PAGE_HEIGHT, background: pageHex }}
        >
          <div
            ref={contentRef}
            className="relative"
            style={{
              minHeight: PAGE_HEIGHT,
              background: `${linedBg}, ${PAPER_GRAIN}`,
              paddingLeft: MARGIN_LEFT,
              paddingRight: 24,
            }}
          >
            {/* margin rule */}
            <span
              className="pointer-events-none absolute inset-y-0"
              style={{ left: 40, width: 1, background: "rgba(190,90,90,0.35)" }}
            />

            {blocks.map((b) => (
              <div key={b.key}>
                <NoteArea
                  noteKey={b.key}
                  value={b.content}
                  fontCss={fontCss}
                  autoFocus={b.key === focusKey}
                  registerRef={registerRef}
                  onChange={(v) => handleChange(b.key, v)}
                  onBlur={() => handleBlur(b.key)}
                  onBackspaceAtStart={() => mergeIntoPrevious(b.key)}
                />
                {b.links.length > 0 && (
                  <div className="mb-2 flex flex-col gap-2">
                    {b.links.map((link) => (
                      <LinkCard key={link.id} link={link} />
                    ))}
                  </div>
                )}
                {b.id && (
                  <div className="flex items-center justify-end gap-2 py-1">
                    <button
                      type="button"
                      onClick={() => deleteBlock(b.key)}
                      className="rounded-full border border-border bg-panel px-2 py-0.5 font-sans text-xs text-muted transition hover:text-red-700"
                    >
                      Delete note
                    </button>
                    <NoteTabs noteId={b.id} onCreate={handleCreateTab} />
                  </div>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addNote}
              className="mt-1 font-sans text-sm text-muted underline underline-offset-2 transition hover:text-accent"
              style={{ lineHeight: `${LINE_HEIGHT}px` }}
            >
              + New note
            </button>
          </div>
        </div>

        {/* binding gutter shadow — the page curving into the spine (left) */}
        <div
          className="pointer-events-none absolute z-[5]"
          style={{
            left: 10,
            top: 8,
            bottom: 8,
            width: 40,
            background:
              "linear-gradient(to right, rgba(0,0,0,0.16), rgba(0,0,0,0.04) 55%, transparent)",
            borderTopLeftRadius: 6,
            borderBottomLeftRadius: 6,
          }}
          aria-hidden
        />

        {/* fore-edge — the stacked page edges you'd see on the right of an open book */}
        <div
          className="pointer-events-none absolute z-[5]"
          style={{
            right: 8,
            top: 8,
            bottom: 8,
            width: 7,
            background:
              "repeating-linear-gradient(to right, rgba(0,0,0,0.09) 0 1px, transparent 1px 3px)",
            borderTopRightRadius: 6,
            borderBottomRightRadius: 6,
          }}
          aria-hidden
        />

        {/* sticky tabs — translucent film flags poking out the right edge */}
        {taggedBlocks.length > 0 && (
          <div className="absolute left-full top-8 z-20 -ml-1.5 flex flex-col gap-2">
            {taggedBlocks.map(({ tab, blockKey }) => {
              const c = TAB_COLORS[tab.color as TabColor];
              return (
                <div key={tab.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => jumpToBlock(blockKey)}
                    title={tab.label ?? c?.meaning ?? "Tab"}
                    aria-label={tab.label ?? c?.meaning ?? "Tab"}
                    className="h-9 w-6 rounded-r-md shadow-sm transition hover:w-7"
                    style={{
                      background: `${c?.hex ?? "#cccccc"}e6`,
                      boxShadow:
                        "inset 0 1px 2px rgba(255,255,255,0.55), 0 1px 2px rgba(0,0,0,0.12)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveTab(tab.id)}
                    aria-label="Remove tab"
                    className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full border border-border bg-panel text-[10px] leading-none text-foreground shadow group-hover:flex"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* page stack — the notebook grows thicker as you add pages */}
      <div className="mt-1 flex flex-col gap-[2px]">
        {Array.from({ length: Math.min(pageCount, 6) }).map((_, i) => (
          <div
            key={i}
            className="h-[2px] rounded-full"
            style={{
              background: "rgba(0,0,0,0.07)",
              marginLeft: 12 + i * 3,
              marginRight: 12 + i * 3,
            }}
          />
        ))}
      </div>

      {/* footer: page nav + dog-ears + save status */}
      <div className="mt-3 flex items-center justify-between gap-3 font-sans text-xs text-muted">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => goTo(currentPage - 1)}
            disabled={currentPage === 0}
            aria-label="Previous page"
            className="rounded-full border border-border bg-panel px-2 py-0.5 transition hover:bg-background disabled:opacity-40"
          >
            ‹
          </button>
          <span>
            Page {currentPage + 1} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() => goTo(currentPage + 1)}
            disabled={currentPage >= pageCount - 1}
            aria-label="Next page"
            className="rounded-full border border-border bg-panel px-2 py-0.5 transition hover:bg-background disabled:opacity-40"
          >
            ›
          </button>
        </div>
        <span aria-live="polite">{saveLabel}</span>
      </div>
    </div>
  );
}
