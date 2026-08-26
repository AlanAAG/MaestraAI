-- Migration 085: visibility control on teacher_resources
-- Allows teachers to share resources with the whole school ('school')
-- or only the directora/admin ('admin_only').

ALTER TABLE teacher_resources
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'school'
  CHECK (visibility IN ('school', 'admin_only'));

-- RLS: non-admin teachers only see 'school' resources; admins see all.
-- Existing policies on teacher_resources are assumed to check school_id.
-- We add a visibility filter on top via a policy update approach.
-- (The existing SELECT policy is replaced below.)

-- Drop existing select policy if it exists so we can recreate with visibility check.
DROP POLICY IF EXISTS "Teachers can view school resources" ON teacher_resources;
DROP POLICY IF EXISTS "school members can view resources" ON teacher_resources;
DROP POLICY IF EXISTS "view_school_resources" ON teacher_resources;

CREATE POLICY "view_school_resources" ON teacher_resources
  FOR SELECT USING (
    school_id IN (
      SELECT school_id FROM teachers WHERE auth_id = auth.uid()
    )
    AND (
      visibility = 'school'
      OR EXISTS (
        SELECT 1 FROM teachers
        WHERE auth_id = auth.uid()
          AND school_id = teacher_resources.school_id
          AND role_type = 'admin'
      )
    )
  );
