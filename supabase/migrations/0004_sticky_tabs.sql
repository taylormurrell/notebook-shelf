-- 0004_sticky_tabs.sql — Module 7: sticky tabs attached to specific notes
-- Apply in Supabase: Dashboard → SQL Editor → paste this file → Run.
-- (Requires 0002_notes.sql to have run first.) Safe to run more than once.

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
create trigger sticky_tabs_set_updated_at
  before update on public.sticky_tabs
  for each row execute function public.set_updated_at();

-- RLS: owner-only, and writes must target a note AND notebook the user owns,
-- with the note verified to actually belong to that notebook. (Checking only
-- note_id ownership would let a caller pair their own note with an arbitrary
-- notebook_id belonging to someone else — the FK only requires the notebook to
-- exist, not that the caller owns it.)
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
