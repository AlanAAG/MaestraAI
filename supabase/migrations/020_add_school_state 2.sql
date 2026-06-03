-- Migration 020: Add state column to schools, replace city in create_school_for_onboarding
-- Date: 2026-06-02
-- Reason: city was a free-text field with no validation; state is a dropdown-constrained
-- Mexican estado, which avoids typos and makes school listing consistent.

ALTER TABLE schools ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'Ciudad de México';

DROP FUNCTION IF EXISTS create_school_for_onboarding(text, text);

CREATE OR REPLACE FUNCTION create_school_for_onboarding(
  school_name  TEXT,
  school_state TEXT DEFAULT 'Ciudad de México'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_school_id      UUID;
  teacher_id         UUID;
  existing_school_id UUID;
BEGIN
  SELECT id, school_id INTO teacher_id, existing_school_id
  FROM teachers
  WHERE auth_id = auth.uid();

  IF teacher_id IS NULL THEN
    RAISE EXCEPTION 'No teacher record found for current user';
  END IF;

  IF existing_school_id IS NOT NULL THEN
    RAISE EXCEPTION 'Teacher already belongs to a school';
  END IF;

  IF school_name IS NULL OR TRIM(school_name) = '' THEN
    RAISE EXCEPTION 'School name cannot be empty';
  END IF;

  INSERT INTO schools (name, state)
  VALUES (TRIM(school_name), COALESCE(TRIM(school_state), 'Ciudad de México'))
  RETURNING id INTO new_school_id;

  UPDATE teachers
  SET school_id = new_school_id
  WHERE id = teacher_id;

  RETURN new_school_id;
END;
$$;

COMMENT ON FUNCTION create_school_for_onboarding IS
  'Onboarding helper: creates school with name+state and links to current teacher. Prevents spam by checking teacher has no existing school.';

GRANT EXECUTE ON FUNCTION create_school_for_onboarding TO authenticated;
