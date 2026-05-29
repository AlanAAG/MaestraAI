-- Migration 012: Fix schools RLS - Allow INSERT for onboarding
-- Issue: Teachers can't create schools during onboarding (403 error)
-- Solution: Add INSERT policy for authenticated users

-- Allow authenticated users to create schools (for onboarding)
CREATE POLICY school_insert ON schools FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON POLICY school_insert ON schools IS 'Allow teachers to create schools during onboarding. Each teacher can still only SELECT their own school via school_via_teacher policy.';
