# Notebook Shelf — PRD review notes

Review of `Notebook_Shelf_PRD_original.pdf`, with the changes we agreed to.

## Verdict
Strong, build-ready PRD. Excellent security posture and modular structure. One real fix
needed before Module 5, plus a few one-sentence clarifications.

## Changes agreed & applied
1. **Dropped the `pages` table.** `notes.position_index` is now the single source of order;
   pages are a render-only visual effect. Removed `start_page_id` and `spans_pages` from
   `notes`. → see `schema.sql`, `module-05-resolved.md`.
2. **`user_id DEFAULT auth.uid()` + RLS `WITH CHECK`** on every table — client never sends
   or can spoof `user_id`. → `schema.sql`.
3. **`ON DELETE CASCADE`** on all child FKs — deleting a notebook cleans up notes/links/tabs.
   → `schema.sql`.
4. **Note content stored/rendered as plain text**, never `dangerouslySetInnerHTML`.
   → `module-05-resolved.md`.
5. **URL validation = http/https scheme allowlist only** (blocks `javascript:`/`data:` XSS).
   To fold into Module 6.
6. **Auth: use `@supabase/ssr` + Next.js middleware** to protect `/app` (not client-only
   redirect). To state in Module 2.
7. **Full-text search prewired**: `notes.search_vector` generated tsvector + GIN index.
   Query with `websearch_to_tsquery`; use `ilike` for topic/title/url. → `schema.sql`.

## Minor / inline-as-you-build
- Add FK indexes (done in schema).
- `sort_order` default behavior on shelf — pick created_at or manual.
- Curated fonts via `next/font` (consistent with "no user-uploaded fonts").
- Remote YouTube thumbnails need Next `images.remotePatterns` (or plain `<img>`); minor
  privacy note (YouTube sees the load).
- `updated_at` maintained by trigger (done in schema).

## Still to edit in the PRD text
- **Section 6:** delete `pages` table; remove `start_page_id` / `spans_pages` from `notes`.
- **Section 11 (Module 5):** replaced by `module-05-resolved.md`.
- **Module 2:** add the `@supabase/ssr` + middleware note.
- **Module 6:** add the http/https scheme allowlist to URL validation.
