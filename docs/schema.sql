-- ============================================================
-- Notebook Shelf — full data model + RLS (reference)
-- Tables: notebooks, notes, links, sticky_tabs
--
-- This is the complete reference. Tables are applied incrementally via the
-- numbered files in supabase/migrations/ as each module is built:
--   0001_notebooks.sql   (Module 4)
--   0002_notes.sql       (Module 5)
--   0003_links.sql       (Module 6)
--   0004_sticky_tabs.sql (Module 7)
--
-- Hardening applied throughout (matches the Glowbook approach):
--   * auth.uid() wrapped as (select auth.uid()) — evaluated once per query.
--   * WITH CHECK on every table so a user can't write rows they don't own.
--   * Child tables also verify the *parent* row is owned by the user, so you
--     can't attach a note/link/tab to someone else's notebook or note.
--   * user_id DEFAULT auth.uid() — the client never sends or spoofs user_id.
--   * ON DELETE CASCADE — deleting a notebook cleans up its notes/links/tabs.
-- Simplified model: NO `pages` table — pages are a render effect, not data.
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- notebooks  (Module 4) ----------
create table if not exists public.notebooks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  topic       text not null,
  cover_color text not null,
  page_color  text not null,
  line_style  text not null default 'college_ruled',
  font_style  text not null,
  sort_order  integer,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists notebooks_user_id_idx on public.notebooks(user_id);
drop trigger if exists notebooks_set_updated_at on public.notebooks;
create trigger notebooks_set_updated_at before update on public.notebooks
  for each row execute function public.set_updated_at();

alter table public.notebooks enable row level security;
drop policy if exists notebooks_owner on public.notebooks;
create policy notebooks_owner on public.notebooks
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------- notes  (Module 5) ----------
-- position_index is the ONLY source of order. Pages are a render effect.
create table if not exists public.notes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  notebook_id    uuid not null references public.notebooks(id) on delete cascade,
  content        text not null default '',        -- plain text only; never HTML
  position_index integer not null,
  search_vector  tsvector generated always as (to_tsvector('english', coalesce(content, ''))) stored,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists notes_notebook_id_idx on public.notes(notebook_id);
create index if not exists notes_user_id_idx     on public.notes(user_id);
create index if not exists notes_search_idx      on public.notes using gin(search_vector);
drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at before update on public.notes
  for each row execute function public.set_updated_at();

alter table public.notes enable row level security;
drop policy if exists notes_owner on public.notes;
create policy notes_owner on public.notes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.notebooks n
      where n.id = notes.notebook_id and n.user_id = (select auth.uid())
    )
  );

-- ---------- links  (Module 6) ----------
create table if not exists public.links (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  note_id                   uuid not null references public.notes(id) on delete cascade,
  url                       text not null,
  source_type               text not null default 'url',   -- 'url' | 'youtube'
  title                     text,
  thumbnail_url             text,
  youtube_video_id          text,
  youtube_timestamp_seconds integer,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index if not exists links_note_id_idx on public.links(note_id);
create index if not exists links_user_id_idx on public.links(user_id);
drop trigger if exists links_set_updated_at on public.links;
create trigger links_set_updated_at before update on public.links
  for each row execute function public.set_updated_at();

alter table public.links enable row level security;
drop policy if exists links_owner on public.links;
create policy links_owner on public.links
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.notes nt
      where nt.id = links.note_id and nt.user_id = (select auth.uid())
    )
  );

-- ---------- sticky_tabs  (Module 7) ----------
create table if not exists public.sticky_tabs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  notebook_id uuid not null references public.notebooks(id) on delete cascade,
  note_id     uuid not null references public.notes(id) on delete cascade,
  color       text not null,
  label       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists sticky_tabs_notebook_id_idx on public.sticky_tabs(notebook_id);
create index if not exists sticky_tabs_note_id_idx     on public.sticky_tabs(note_id);
create index if not exists sticky_tabs_user_id_idx      on public.sticky_tabs(user_id);
drop trigger if exists sticky_tabs_set_updated_at on public.sticky_tabs;
create trigger sticky_tabs_set_updated_at before update on public.sticky_tabs
  for each row execute function public.set_updated_at();

alter table public.sticky_tabs enable row level security;
drop policy if exists sticky_tabs_owner on public.sticky_tabs;
create policy sticky_tabs_owner on public.sticky_tabs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.notes nt
      where nt.id = sticky_tabs.note_id
        and nt.user_id = (select auth.uid())
        and nt.notebook_id = sticky_tabs.notebook_id
    )
    and exists (
      select 1 from public.notebooks n
      where n.id = sticky_tabs.notebook_id and n.user_id = (select auth.uid())
    )
  );
