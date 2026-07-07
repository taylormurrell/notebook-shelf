# Section 11: Module 5 — Notebook page editor (resolved)

> Replaces the original Section 11. Reflects the simplified model: **no `pages` table** —
> pages are a visual effect, not stored data. `notes.position_index` is the only source of order.

## Claude Code prompt for Module 5

Implement Module 5 only.

**Goal:** Build the notebook page editor for typed notes on college-ruled lined paper.

### Requirements
- Create the Supabase `notes` table if not already created (there is **no** `pages` table — pages are a visual effect, not stored data).
- Add RLS policies for `notes` (owner-only).
- Add notebook detail route at `/app/notebooks/[notebookId]`.
- Render the notebook as college-ruled lined paper using the notebook's chosen `page_color` and `font_style`.
- Load the notebook's notes ordered by `position_index` and render them as one continuous, ordered flow.
- User can type notes into the notebook; text aligns naturally with the lined background.
- **Pagination is render-only:** when content flows past the bottom of the current page, the editor visually continues onto the next page. Nothing about pages is persisted — no page numbers, no page rows. A note may visually span multiple pages; that's purely layout.
- User can navigate pages by clicking left/right page-edge controls and by keyboard arrow keys. Navigation moves the *viewport* across the rendered flow; it does not change any stored data.
- Save behavior: persist note `content` and `position_index` to Supabase (debounced autosave or explicit save — keep it simple).
- Add loading and error states.
- Store and render note content as **plain text only** — never `dangerouslySetInnerHTML`, never rich HTML.
- Keep the editor lean. Do not install TipTap/Slate/ProseMirror or any rich-text engine unless absolutely necessary. No formatting toolbar, no handwriting, no drag-and-drop positioning.

### Editor behavior
- Feels like typing into a physical notebook, but the underlying data is just an ordered list of plain-text notes.
- Use simple sequential `position_index` values for order.
- Page overflow is estimated on the client from content height; when overflow is detected, reveal/scroll to the next visual page. Do not build a pixel-perfect pagination engine.

### Security
- User can only access notes for their own notebooks (enforced by RLS: `user_id = auth.uid()`).
- Treat note content as untrusted text; render as text.
- Do not log note content.

### Acceptance criteria
- User can open a notebook and type notes.
- Notes persist after refresh, in the correct order.
- Lined paper displays correctly using the notebook's font and page color.
- Content visually flows onto a new page when it overflows (with nothing extra saved).
- Arrow-key navigation and page-edge click navigation both move across the rendered pages.
- User cannot access another user's notes.

Stop after this module and summarize changed files.
