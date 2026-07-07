-- 0002_notes.sql — Module 5: notes table
-- Apply in Supabase: Dashboard → SQL Editor → paste this file → Run.
-- (Requires 0001_notebooks.sql to have run first.)
-- Safe to run more than once.

-- position_index is the ONLY source of note order. There is no `pages` table —
-- pages are a render-only visual effect in the editor.
create table if not exists public.notes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  notebook_id    uuid not null references public.notebooks(id) on delete cascade,
  content        text not null default '',        -- plain text only; never HTML
  position_index integer not null,
  -- searchable text, maintained automatically; used in Module 8 (search).
  search_vector  tsvector generated always as (to_tsvector('english', coalesce(content, ''))) stored,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists notes_notebook_id_idx on public.notes(notebook_id);
create index if not exists notes_user_id_idx     on public.notes(user_id);
create index if not exists notes_search_idx      on public.notes using gin(search_vector);

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- RLS: owner-only, and writes must also target a notebook the user owns
-- (parent-ownership check), so you can't attach a note to someone else's book.
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
