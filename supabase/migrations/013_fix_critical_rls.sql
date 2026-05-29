-- Migration 013: Fix Critical RLS Vulnerabilities
-- Date: 2026-05-28
-- Issue: Migration 007 added teacher_id to vocabulary_items but never updated RLS policies
-- Issue: Migration 012 has overly permissive school INSERT policy
-- Issue: Migration 011 allows users to forge audit logs and failed auth attempts

-- ============================================================
-- Fix 1: vocabulary_items RLS (migration 007 broke this)
-- ============================================================

-- Drop the overly permissive policy from migration 004
DROP POLICY IF EXISTS vocab_public_read ON vocabulary_items;

-- Global vocabulary (seeded, teacher_id IS NULL) - everyone can read
CREATE POLICY "vocab_global_read" ON vocabulary_items
  FOR SELECT
  USING (teacher_id IS NULL);

-- Teacher-specific vocabulary - can only read own
CREATE POLICY "vocab_own_read" ON vocabulary_items
  FOR SELECT
  USING (teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid()));

-- Teacher-specific vocabulary - can only create own
CREATE POLICY "vocab_own_create" ON vocabulary_items
  FOR INSERT
  WITH CHECK (teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid()));

-- Teacher-specific vocabulary - can only update own
CREATE POLICY "vocab_own_update" ON vocabulary_items
  FOR UPDATE
  USING (teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid()));

-- Teacher-specific vocabulary - can only delete own
CREATE POLICY "vocab_own_delete" ON vocabulary_items
  FOR DELETE
  USING (teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid()));

COMMENT ON POLICY vocab_global_read ON vocabulary_items IS
  'Global seeded vocabulary (teacher_id IS NULL) readable by all authenticated users';
COMMENT ON POLICY vocab_own_read ON vocabulary_items IS
  'Teacher-specific vocabulary readable only by owner';
COMMENT ON POLICY vocab_own_create ON vocabulary_items IS
  'Teachers can only create vocabulary for themselves';

-- ============================================================
-- Fix 2: schools INSERT - tighten overly permissive policy
-- ============================================================

-- Drop the overly permissive policy from migration 012
DROP POLICY IF EXISTS school_insert ON schools;

-- Only allow school creation for authenticated users
-- auth.uid() IS NOT NULL is implicit for 'TO authenticated'
CREATE POLICY "school_insert_authenticated" ON schools
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON POLICY school_insert_authenticated ON schools IS
  'Onboarding only: allows authenticated users to create schools. Visibility still restricted via school_via_teacher SELECT policy. Consider moving to service-role-only function for tighter control.';

-- ============================================================
-- Fix 3: audit_logs - remove user INSERT, rely on service role only
-- ============================================================

-- Drop the overly permissive policy from migration 011
DROP POLICY IF EXISTS "Service inserts audit logs" ON audit_logs;

-- No new INSERT policy - service role bypasses RLS automatically
-- Users cannot insert directly, only via lib/audit.ts using service role

COMMENT ON TABLE audit_logs IS
  'Audit trail (service role only for writes via lib/audit.ts). Users cannot insert directly. Prevents audit log forgery.';

-- ============================================================
-- Fix 4: failed_auth_attempts - remove user INSERT
-- ============================================================

-- Drop the overly permissive policy from migration 011
DROP POLICY IF EXISTS "Service inserts failed auth" ON failed_auth_attempts;

-- No new INSERT policy - service role bypasses RLS automatically

COMMENT ON TABLE failed_auth_attempts IS
  'Auth failure tracking (service role only for writes). Users cannot insert directly. Prevents log pollution.';
