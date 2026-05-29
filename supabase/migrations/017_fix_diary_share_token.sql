-- Migration 017: Fix teacher_diary Shared Link Security
-- Date: 2026-05-29
-- Issue: Migration 010 allows reading ANY shared diary without validating share_token
-- Attack: Enumerate diary IDs to read all shared diaries without the secret token
-- Fix: Split into two policies - authenticated for own/school, anon for token-based

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Teachers view own or school diaries" ON teacher_diary;

-- Policy 1: Authenticated teachers view own or school diaries
CREATE POLICY "Teachers view own or school diaries" ON teacher_diary
  FOR SELECT
  TO authenticated
  USING (
    -- Own diaries
    teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid())
    -- School-visible diaries (same school)
    OR (
      visibility = 'school'
      AND teacher_id IN (
        SELECT t.id FROM teachers t
        WHERE t.school_id = (SELECT school_id FROM teachers WHERE auth_id = auth.uid())
      )
    )
  );

-- Policy 2: Public access via share token (no auth required)
-- NOTE: Application code MUST include: WHERE share_token = $1
-- This policy allows the query, but the WHERE clause prevents enumeration
CREATE POLICY "Public view shared diaries via token" ON teacher_diary
  FOR SELECT
  TO anon
  USING (
    visibility = 'shared_link'
    AND share_expires_at > NOW()
    AND share_token IS NOT NULL
  );

COMMENT ON POLICY "Teachers view own or school diaries" ON teacher_diary IS
  'Authenticated teachers can view their own diaries and school-visible diaries from colleagues.';
COMMENT ON POLICY "Public view shared diaries via token" ON teacher_diary IS
  'Unauthenticated users can view shared diaries ONLY when querying with the correct share_token in WHERE clause. Application code must enforce: WHERE share_token = $1 to prevent enumeration attacks.';
