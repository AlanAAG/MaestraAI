-- Migration 016: Fix Richmond RLS Policies
-- Date: 2026-05-29
-- Issue 1: Migration 006 has backwards validation pattern (same as usage_logs)
-- Issue 2: richmond_assignments and richmond_scores don't account for extracurricular teachers
--          Only checks titular_teacher_id, ignores group_teachers table

-- ============================================================
-- Fix richmond_credentials
-- ============================================================

DROP POLICY IF EXISTS "Teachers can view own group credentials" ON richmond_credentials;
DROP POLICY IF EXISTS "Teachers can manage own group credentials" ON richmond_credentials;

CREATE POLICY "Teachers view group credentials" ON richmond_credentials
  FOR SELECT
  USING (teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid()));

CREATE POLICY "Teachers insert group credentials" ON richmond_credentials
  FOR INSERT
  WITH CHECK (teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid()));

CREATE POLICY "Teachers update group credentials" ON richmond_credentials
  FOR UPDATE
  USING (teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid()));

CREATE POLICY "Teachers delete group credentials" ON richmond_credentials
  FOR DELETE
  USING (teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid()));

COMMENT ON POLICY "Teachers view group credentials" ON richmond_credentials IS
  'Teachers can only view their own Richmond credentials. Fixed validation pattern.';

-- ============================================================
-- Fix richmond_sync_log
-- ============================================================

DROP POLICY IF EXISTS "Teachers can view own sync logs" ON richmond_sync_log;
DROP POLICY IF EXISTS "System can insert sync logs" ON richmond_sync_log;
DROP POLICY IF EXISTS "System can update sync logs" ON richmond_sync_log;

CREATE POLICY "Teachers view sync logs" ON richmond_sync_log
  FOR SELECT
  USING (teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid()));

CREATE POLICY "Teachers insert sync logs" ON richmond_sync_log
  FOR INSERT
  WITH CHECK (teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid()));

CREATE POLICY "Teachers update sync logs" ON richmond_sync_log
  FOR UPDATE
  USING (teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid()));

COMMENT ON POLICY "Teachers view sync logs" ON richmond_sync_log IS
  'Teachers can only view their own sync logs. Fixed validation pattern.';

-- ============================================================
-- Fix richmond_assignments - Add extracurricular teacher support
-- ============================================================

DROP POLICY IF EXISTS "Teachers can view own group assignments" ON richmond_assignments;
DROP POLICY IF EXISTS "System can manage assignments" ON richmond_assignments;

-- Allow titular teachers AND extracurricular teachers to view assignments
CREATE POLICY "Teachers view group assignments" ON richmond_assignments
  FOR SELECT
  USING (
    group_id IN (
      -- Titular teachers
      SELECT g.id FROM groups g
      WHERE g.titular_teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid())
      UNION
      -- Extracurricular teachers (Computación, Ed. Física, etc.)
      SELECT gt.group_id FROM group_teachers gt
      WHERE gt.teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid())
    )
  );

-- Allow titular teachers AND extracurricular teachers to manage assignments
CREATE POLICY "Teachers manage assignments" ON richmond_assignments
  FOR ALL
  USING (
    group_id IN (
      SELECT g.id FROM groups g
      WHERE g.titular_teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid())
      UNION
      SELECT gt.group_id FROM group_teachers gt
      WHERE gt.teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid())
    )
  );

COMMENT ON POLICY "Teachers view group assignments" ON richmond_assignments IS
  'Titular and extracurricular teachers can view assignments for their groups.';
COMMENT ON POLICY "Teachers manage assignments" ON richmond_assignments IS
  'Titular and extracurricular teachers can create/update/delete assignments for their groups.';

-- ============================================================
-- Fix richmond_scores - Add extracurricular teacher support
-- ============================================================

DROP POLICY IF EXISTS "Teachers can view own students scores" ON richmond_scores;
DROP POLICY IF EXISTS "System can manage scores" ON richmond_scores;

-- Allow teachers to view scores for students in their groups
CREATE POLICY "Teachers view student scores" ON richmond_scores
  FOR SELECT
  USING (
    assignment_id IN (
      SELECT a.id FROM richmond_assignments a
      WHERE a.group_id IN (
        SELECT g.id FROM groups g
        WHERE g.titular_teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid())
        UNION
        SELECT gt.group_id FROM group_teachers gt
        WHERE gt.teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid())
      )
    )
  );

-- Allow teachers to manage scores for students in their groups
CREATE POLICY "Teachers manage scores" ON richmond_scores
  FOR ALL
  USING (
    assignment_id IN (
      SELECT a.id FROM richmond_assignments a
      WHERE a.group_id IN (
        SELECT g.id FROM groups g
        WHERE g.titular_teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid())
        UNION
        SELECT gt.group_id FROM group_teachers gt
        WHERE gt.teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid())
      )
    )
  );

COMMENT ON POLICY "Teachers view student scores" ON richmond_scores IS
  'Titular and extracurricular teachers can view scores for students in their groups.';
COMMENT ON POLICY "Teachers manage scores" ON richmond_scores IS
  'Titular and extracurricular teachers can create/update/delete scores for students in their groups.';
