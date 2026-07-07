-- 0001_notebooks.sql — Module 4: notebooks table
-- Apply in Supabase: Dashboard → SQL Editor → paste this file → Run.
-- Safe to run more than once (uses IF NOT EXISTS / DROP ... IF EXISTS).

-- Shared trigger function to keep updated_at fresh. Created once here and
-- reused by later tables (notes, links, sticky_tabs).
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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
create trigger notebooks_set_updated_at
  before update on public.notebooks
  for each row execute function public.set_updated_at();

-- Row Level Security: a user can only touch their own notebooks.
-- auth.uid() is wrapped in a subquery so Postgres evaluates it once per query
-- (InitPlan) instead of once per row. WITH CHECK blocks writing rows owned by
-- anyone else; the user_id column default fills it in from the session.
alter table public.notebooks enable row level security;

drop policy if exists notebooks_owner on public.notebooks;
create policy notebooks_owner on public.notebooks
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
