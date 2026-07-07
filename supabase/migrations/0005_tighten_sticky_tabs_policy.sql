-- 0005_tighten_sticky_tabs_policy.sql — security fix
-- Apply in Supabase: Dashboard → SQL Editor → paste this file → Run.
--
-- The original sticky_tabs write policy only verified that note_id belongs to
-- the current user. It did not check that notebook_id is also owned by that
-- user, or that the note actually belongs to that notebook — so a caller could
-- insert a tab pairing their own note with an arbitrary notebook_id (the
-- foreign key only requires the notebook to exist, not that the caller owns
-- it). This tightens the WITH CHECK clause to close that gap. The USING clause
-- (reads) already only returns rows where user_id matches, so reads are
-- unaffected.

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
