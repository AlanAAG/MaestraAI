-- Normalize existing editorial values to lowercase registry keys
UPDATE teachers
  SET editorial = LOWER(TRIM(editorial))
  WHERE editorial IS NOT NULL;

-- Values not in the registry fall back to 'other'
UPDATE teachers
  SET editorial = 'other'
  WHERE editorial IS NOT NULL
    AND editorial NOT IN ('richmond', 'macmillan', 'pearson', 'oxford', 'cambridge', 'other');

-- Validate editorial values going forward
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teachers_editorial_valid'
  ) THEN
    ALTER TABLE teachers
      ADD CONSTRAINT teachers_editorial_valid
      CHECK (editorial IN ('richmond', 'macmillan', 'pearson', 'oxford', 'cambridge', 'other'));
  END IF;
END$$;

-- School admins and coordinators can read all students across their school
-- (students only have group_id; school is reached via groups.school_id)
DROP POLICY IF EXISTS students_school_admin_read ON students;
CREATE POLICY students_school_admin_read ON students
  FOR SELECT
  USING (
    group_id IN (
      SELECT g.id
      FROM   groups g
      JOIN   teachers t ON t.school_id = g.school_id
      WHERE  t.auth_id  = auth.uid()
        AND  t.role_type IN ('admin', 'coordinator')
        AND  t.school_id IS NOT NULL
    )
  );
