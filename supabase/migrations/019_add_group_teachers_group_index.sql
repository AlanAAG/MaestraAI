-- Migration 019: Add Missing group_teachers.group_id Index
-- Date: 2026-05-29
-- Issue: RLS policies in migrations 004, 016 query group_teachers by group_id
--        but only teacher_id index exists (migration 014)
-- Impact: Full table scan for extracurricular teacher access (N+1 at scale)

-- Add missing index for group_teachers.group_id lookups
CREATE INDEX IF NOT EXISTS idx_group_teachers_group_id ON group_teachers(group_id);

COMMENT ON INDEX idx_group_teachers_group_id IS
  'Critical: prevents table scan when checking extracurricular teacher access to groups. Used by RLS policies in groups, students, richmond_assignments, and richmond_scores tables.';
