-- 046_students_richmond_unique.sql
-- Richmond's per-entry student id is per-ASSIGNMENT (a submission id), not a stable
-- student identity, so the roster is deduped by name in app code — NOT by a DB unique
-- index on richmond_student_id (that column is no longer written for Richmond students).
--
-- This migration only drops a dead column: special_needs_encrypted was never read or
-- written anywhere. We deliberately do not store special-needs data we don't use.
-- (has_nee stays — it's set only via the manual student flow and used by reports/planner.)

ALTER TABLE students DROP COLUMN IF EXISTS special_needs_encrypted;
