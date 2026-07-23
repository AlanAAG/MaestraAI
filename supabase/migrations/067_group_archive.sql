-- 067: Group archiving (end of school year / "Nuevo ciclo escolar").
-- Archived groups keep all their students, planeaciones, and calificaciones (no FK cascade,
-- unlike delete) but disappear from rosters and pickers. Mirrors the teachers.deleted_at /
-- revoked_at soft-delete pattern.

ALTER TABLE groups ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

COMMENT ON COLUMN groups.archived_at IS
  'Set when the school year ends (Nuevo ciclo escolar). NULL = active. Students are preserved.';

CREATE INDEX IF NOT EXISTS idx_groups_active
  ON groups(titular_teacher_id)
  WHERE archived_at IS NULL;
