-- Migration 043: Allow all authenticated users to read all schools
-- Reason: school_via_teacher only shows schools the teacher is already linked to,
-- so the onboarding dropdown is always empty for new teachers.
-- School names are non-sensitive public info.

CREATE POLICY schools_read_all ON schools
  FOR SELECT
  TO authenticated
  USING (true);
