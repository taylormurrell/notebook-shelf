-- 0006_note_content_length_limit.sql — security/integrity fix
-- Apply in Supabase: Dashboard → SQL Editor → paste this file → Run.
--
-- Note content had no length limit at the database layer (the app now checks
-- 50,000 chars before saving, but a direct API call could bypass that). This
-- enforces the same cap in Postgres so it holds regardless of the write path.
-- 50,000 is generous for real notes; it exists to stop unbounded storage abuse
-- and to prevent rows so large that the generated search_vector column (which
-- has its own internal size ceiling) throws a confusing error.

alter table public.notes
  add constraint notes_content_length check (char_length(content) <= 50000);
