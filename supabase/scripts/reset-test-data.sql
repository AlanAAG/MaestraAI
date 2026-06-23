-- ⚠️ DESTRUCTIVE — TEST DATABASE ONLY ⚠️
-- Wipes ALL application data in the public schema (teachers, planeaciones, students,
-- vocabulary, materials, api_keys, richmond_*, school data, everything) so you can
-- re-test onboarding from a clean slate.
--
-- It does NOT touch:
--   • the schema / tables / RLS policies (structure stays intact)
--   • auth.users (your login still works — but since the teachers row is gone,
--     logging back in lands you on onboarding)
--
-- This is intentionally NOT a numbered migration: migrations run ONCE and run on
-- EVERY environment including production. A reset script runs only when YOU run it.
--
-- HOW TO RUN (pick one):
--   • Supabase Dashboard → SQL Editor → paste this file → Run
--   • CLI:  supabase db execute --file supabase/scripts/reset-test-data.sql
--   • psql: psql "$DATABASE_URL" -f supabase/scripts/reset-test-data.sql
--
-- TRUNCATE ... CASCADE clears every table and resets identity sequences. Because every
-- public table is truncated, FK order doesn't matter.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('schema_migrations')  -- never wipe migration history
  LOOP
    EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE;', r.tablename);
    RAISE NOTICE 'truncated %', r.tablename;
  END LOOP;
END $$;

-- Note: this also clears the 129 system-seeded vocabulary words (vocabulary_items with
-- teacher_id IS NULL). To restore them, re-run the seed INSERTs from the vocabulary seed
-- migration. If you'd rather KEEP the system seed, replace the loop's exclusion with:
--   AND tablename NOT IN ('schema_migrations', 'vocabulary_items')
-- and add:  DELETE FROM public.vocabulary_items WHERE teacher_id IS NOT NULL;
