-- Migration 018: Secure School Creation with RPC Function
-- Date: 2026-05-29
-- Issue: Migration 013 allows ANY authenticated user to create unlimited schools (WITH CHECK true)
-- Risk: Spam attack, no validation
-- Fix: Remove INSERT policy, create secure RPC function for onboarding only

-- Drop the overly permissive policy
DROP POLICY IF EXISTS school_insert_authenticated ON schools;

-- Create RPC function for school creation with validation
CREATE OR REPLACE FUNCTION create_school_for_onboarding(
  school_name TEXT,
  school_city TEXT DEFAULT 'CDMX'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_school_id UUID;
  teacher_id UUID;
  existing_school_id UUID;
BEGIN
  -- Verify user has a teacher record
  SELECT id, school_id INTO teacher_id, existing_school_id
  FROM teachers
  WHERE auth_id = auth.uid();

  IF teacher_id IS NULL THEN
    RAISE EXCEPTION 'No teacher record found for current user';
  END IF;

  -- Prevent spam: teacher already has a school
  IF existing_school_id IS NOT NULL THEN
    RAISE EXCEPTION 'Teacher already belongs to a school';
  END IF;

  -- Validate input
  IF school_name IS NULL OR TRIM(school_name) = '' THEN
    RAISE EXCEPTION 'School name cannot be empty';
  END IF;

  -- Create school
  INSERT INTO schools (name, city)
  VALUES (TRIM(school_name), COALESCE(TRIM(school_city), 'CDMX'))
  RETURNING id INTO new_school_id;

  -- Link teacher to school
  UPDATE teachers
  SET school_id = new_school_id
  WHERE id = teacher_id;

  RETURN new_school_id;
END;
$$;

COMMENT ON FUNCTION create_school_for_onboarding IS
  'Onboarding helper: creates school and links to current teacher. Prevents spam by checking teacher has no existing school. Used by onboarding wizard only.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION create_school_for_onboarding TO authenticated;
