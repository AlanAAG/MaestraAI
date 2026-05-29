-- Migration 015: Fix usage_logs RLS Policies
-- Date: 2026-05-29
-- Issue: Migration 005 has backwards validation pattern allowing teachers to forge logs for other teachers
-- Pattern: auth.uid() IN (SELECT auth_id FROM teachers WHERE id = usage_logs.teacher_id)
-- Should be: teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid())

-- Drop broken policies
DROP POLICY IF EXISTS "Teachers can view own usage logs" ON usage_logs;
DROP POLICY IF EXISTS "System can insert usage logs" ON usage_logs;
DROP POLICY IF EXISTS "System can update usage logs" ON usage_logs;

-- Correct SELECT policy
CREATE POLICY "Teachers view own usage logs" ON usage_logs
  FOR SELECT
  USING (teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid()));

-- Correct INSERT policy
CREATE POLICY "Teachers insert own usage logs" ON usage_logs
  FOR INSERT
  WITH CHECK (teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid()));

-- Correct UPDATE policy
CREATE POLICY "Teachers update own usage logs" ON usage_logs
  FOR UPDATE
  USING (teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid()));

COMMENT ON POLICY "Teachers view own usage logs" ON usage_logs IS
  'Teachers can only view their own usage logs. Uses correct validation pattern.';
COMMENT ON POLICY "Teachers insert own usage logs" ON usage_logs IS
  'Teachers can only insert usage logs for themselves. Prevents forging logs for other teachers.';
COMMENT ON POLICY "Teachers update own usage logs" ON usage_logs IS
  'Teachers can only update their own usage logs.';
