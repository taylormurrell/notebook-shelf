# Notebook Shelf

A calm, personal digital notebook web app — a forward-facing shelf of notebooks
with typed notes, links, YouTube timestamp references, sticky tabs, and search.

Laptop-first and personal-use-first, but built multi-user-ready and secure by
default. See `docs/` for the full PRD, the database schema, and review notes.

## Tech stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS
- Supabase (Auth, Postgres, full-text search) — added in later modules

## Local setup

Requirements: Node.js 18.18+ (Node 20+ recommended).

```bash
# 1. Install dependencies
npm install

# 2. Create your local env file (real values, never committed)
cp .env.example .env.local
# then fill in your Supabase project URL and anon key
#   NEXT_PUBLIC_SUPABASE_URL=...
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# (Supabase is not needed until Module 2 / Module 4.)

# 3. Run the dev server
npm run dev
```

Open http://localhost:3000 — the landing page loads at `/`, and the placeholder
authenticated shelf loads at `/app`.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — lint

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (client-safe) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (client-safe, protected by RLS) |

Only the anon key is ever used on the client. The service-role key must never
appear in frontend code or the repo.

## Project structure

```
docs/                     PRD, schema.sql, resolved specs, review notes
src/
  app/
    layout.tsx            Root layout + fonts
    page.tsx              Landing page (/)
    app/page.tsx          Authenticated shelf (/app) — gated, greets user
    login/page.tsx        Email/password login (/login)
    signup/page.tsx       Email/password signup (/signup)
    globals.css           Tailwind + warm notebook theme
  components/
    auth-form.tsx         Shared login/signup form
    logout-button.tsx     Client logout button
  lib/
    config.ts             App name / tagline (single place to rename the app)
    supabase/client.ts    Browser Supabase client (anon key)
    supabase/server.ts    Server Supabase client (cookies)
  proxy.ts                Route protection + session refresh (Next 16 proxy)
```

## Supabase setup (needed for auth)

1. Create a free project at https://supabase.com → **New project**.
2. In the project, open **Settings → API** and copy the **Project URL** and the
   **anon / public** key.
3. Put them in `.env.local` (see `.env.example`).
4. For instant login without email confirmation (fine for personal use), open
   **Authentication → Providers → Email** and turn **off** "Confirm email".
5. Restart `npm run dev`.

## Database migrations

SQL lives in `supabase/migrations/` as numbered files, committed to the repo.
Apply each one by pasting it into the Supabase **SQL Editor** and running it
(no CLI needed). `docs/schema.sql` is the full reference for all tables.

- `0001_notebooks.sql` — notebooks table + RLS (Module 4)
- `0002_notes.sql` — notes table + RLS + search column (Module 5)
- `0003_links.sql` — links table + RLS (Module 6)
- `0004_sticky_tabs.sql` — sticky_tabs table + RLS (Module 7)
- `0005_tighten_sticky_tabs_policy.sql` — security fix: verifies notebook_id
  ownership + note↔notebook match on writes (run this even though 0004 already
  includes the fix, since your database ran the earlier version)
- `0006_note_content_length_limit.sql` — caps note content at 50,000 chars

## Build progress

- [x] Module 1 — Project setup and app shell
- [x] Module 2 — Auth (Supabase email/password; `/app` gated by proxy)
- [x] Module 3 — Notebook shelf (forward-facing grid, mock data; DB in Module 4)
- [x] Module 4 — Notebook creation and customization (real Supabase CRUD + RLS)
- [x] Module 5 — Notebook page editor (lined paper, autosave, render-only pages)
- [x] Module 6 — Links and YouTube previews (auto-detect, safe links, thumbnails)
- [x] Module 7 — Sticky tabs (colored tabs per note, review strip, jump-to-note)
- [x] Module 8 — Search (ilike across notebooks/notes/links, jump-to-note)
- [x] Module 9 — Polish (loading/empty/error states, confirmations, keyboard nav,
      physical-notebook feel: cover frame, ribbon, paper grain, book edges)
- [x] Module 10 — QA + security (lint/build clean, CSP + security headers, RLS review)

## Security summary

- **Auth:** Supabase email/password; `/app/*` gated by `src/proxy.ts`.
- **RLS:** enabled on every table; owner-only policies (`(select auth.uid()) = user_id`)
  with `WITH CHECK` (incl. parent-ownership on notes/links/sticky_tabs). `user_id`
  is filled by a DB default — never trusted from the client.
- **Keys:** only the anon/publishable key is used on the client; the service-role
  key is never referenced in app code.
- **Headers:** CSP (Supabase + YouTube-thumbnail allowlist only), `X-Frame-Options:
  DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` — see `next.config.ts`.
- **Untrusted input:** note content stored/rendered as plain text (never
  `dangerouslySetInnerHTML`); pasted URLs restricted to `http`/`https`; external
  links open with `target="_blank" rel="noopener noreferrer"`; link previews store
  metadata only (no page HTML, no video).
- **Fail-closed:** the proxy and `/app` both refuse to render (rather than
  silently allowing access) if Supabase env vars are missing in production.
- **Limits:** note content capped at 50,000 chars (app + DB constraint);
  passwords require 8+ characters (also set the same minimum in Supabase →
  Authentication → Policies, since the client-side check alone isn't enforced
  server-side by Supabase Auth).

### Security fixes applied 2026-07-07 (post-launch review)

- Fixed a gap where `sticky_tabs` RLS didn't verify `notebook_id` ownership,
  letting a caller pair their own note with an arbitrary notebook id (existence
  oracle + integrity risk). See `0005_tighten_sticky_tabs_policy.sql`.
- Proxy and `/app` now fail closed (500) in production if Supabase env vars are
  missing, instead of silently rendering without auth.
- Added a server + DB-level cap on note content length.
- `LinkCard` re-validates the URL scheme and YouTube video id at render time,
  not just at write time (defense in depth).
- Narrowed a broad `try/catch` in `syncLinks` so only "table not created yet"
  errors are silently ignored — other failures are now logged (error code only).

## Manual QA checklist

Run through this before calling the MVP done:

- [ ] Sign up, log in, log out
- [ ] Logged-out `/app` (and `/app/notebooks/...`, `/app/search`) redirect to `/login`
- [ ] Create / edit / delete a notebook (delete asks for confirmation)
- [ ] Topic never shows on the cover; appears on shelf hover + notebook header
- [ ] Open a notebook: lined paper uses the chosen page color + font
- [ ] Type notes; they persist after refresh, in order
- [ ] Backspace at a note's start merges into the note above; "Delete note" removes one
- [ ] New page appears past the bottom; ‹/› and arrow keys navigate pages
- [ ] Reopen a notebook — it lands where you left off (ribbon)
- [ ] Paste a normal URL → link card; paste a YouTube URL → thumbnail card;
      `?t=90` / `?t=1m30s` → timestamp chip
- [ ] Add a sticky tab (color + label); it appears as a side flag + top tile;
      click to jump; × to remove
- [ ] Search finds notebooks, notes, and links; results jump to the note
- [ ] External links open in a new tab safely
- [ ] `.env.local` is git-ignored; `.env.example` has placeholders only; no secrets committed
