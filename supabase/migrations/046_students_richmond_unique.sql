-- 046_students_richmond_unique.sql
-- The Richmond sync auto-creates one students row per (group, richmond_student_id).
-- A unique index makes that idempotent and blocks duplicate students from concurrent syncs.
-- Partial index (WHERE richmond_student_id IS NOT NULL) so manually-added students
-- without a Richmond id are unaffected.

CREATE UNIQUE INDEX IF NOT EXISTS students_group_richmond_uid
  ON students (group_id, richmond_student_id)
  WHERE richmond_student_id IS NOT NULL;
