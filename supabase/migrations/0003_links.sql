-- 0003_links.sql — Module 6: links table (hyperlinks + YouTube references)
-- Apply in Supabase: Dashboard → SQL Editor → paste this file → Run.
-- (Requires 0002_notes.sql to have run first.) Safe to run more than once.
-- Stores link METADATA only — never raw webpage HTML or video content.

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
create trigger links_set_updated_at
  before update on public.links
  for each row execute function public.set_updated_at();

-- RLS: owner-only, and writes must target a note the user owns.
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
