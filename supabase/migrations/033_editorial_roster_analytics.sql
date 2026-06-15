-- Track how a student entered the system
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS import_source text DEFAULT 'manual'
  CHECK (import_source IN ('manual', 'richmond_extension', 'csv'));

-- Cache Richmond's human-readable group name for future auto-discovery
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS richmond_group_name text;

-- Unique constraint needed for upsert-on-conflict in auto-create
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'students_group_id_richmond_student_id_key'
  ) THEN
    ALTER TABLE students
      ADD CONSTRAINT students_group_id_richmond_student_id_key
      UNIQUE (group_id, richmond_student_id);
  END IF;
END$$;
