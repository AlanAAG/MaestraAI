-- Migration 014: Add Critical Missing FK Indexes
-- Date: 2026-05-28
-- Issue: 14+ foreign key columns without indexes causing N+1 queries and table scans
-- Impact: At 100+ schools with 3,000+ students, page loads will take 5-10 seconds

-- ============================================================
-- Students (MOST CRITICAL - roster fetches)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_students_group_id ON students(group_id);
CREATE INDEX IF NOT EXISTS idx_students_richmond_id ON students(richmond_student_id)
  WHERE richmond_student_id IS NOT NULL;

COMMENT ON INDEX idx_students_group_id IS
  'Critical: prevents table scan when fetching class roster (30-40 students per group, 3,000+ at scale)';

-- ============================================================
-- Materials (lesson plan detail pages)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_materials_lesson_plan_id ON materials(lesson_plan_id);
CREATE INDEX IF NOT EXISTS idx_materials_teacher_id ON materials(teacher_id);
CREATE INDEX IF NOT EXISTS idx_materials_fortnight_id ON materials(fortnight_id);
CREATE INDEX IF NOT EXISTS idx_materials_type_projectable ON materials(type, is_projectable);

COMMENT ON INDEX idx_materials_lesson_plan_id IS
  'Critical: prevents N+1 when loading lesson plan materials (5-20 per plan, 10,000+ at scale)';

-- ============================================================
-- Lesson Plans (week views)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_lesson_plans_fortnight_id ON lesson_plans(fortnight_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_teacher_id ON lesson_plans(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_approved ON lesson_plans(approved);

COMMENT ON INDEX idx_lesson_plans_fortnight_id IS
  'Critical: prevents N+1 when loading week schedule (10-14 plans per fortnight, 20,000+ at scale)';

-- ============================================================
-- Fortnights (calendar views)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_fortnights_group_id ON fortnights(group_id);
CREATE INDEX IF NOT EXISTS idx_fortnights_teacher_id ON fortnights(teacher_id);
CREATE INDEX IF NOT EXISTS idx_fortnights_status ON fortnights(status);

-- ============================================================
-- Teachers (school admin queries)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_auth_id ON teachers(auth_id);

COMMENT ON INDEX idx_teachers_auth_id IS
  'Critical: fast lookup for auth.uid() to teachers.id mapping (used in every RLS policy)';

-- ============================================================
-- Groups (school navigation)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_groups_school_id ON groups(school_id);
CREATE INDEX IF NOT EXISTS idx_groups_titular_teacher_id ON groups(titular_teacher_id);

-- ============================================================
-- Group Teachers (subject teacher queries)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_group_teachers_teacher_id ON group_teachers(teacher_id);

-- ============================================================
-- Observations (student detail pages)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_observations_student_id ON teacher_observations(student_id);
CREATE INDEX IF NOT EXISTS idx_observations_teacher_id ON teacher_observations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_observations_date ON teacher_observations(observed_date);

-- ============================================================
-- Report Cards (student transcripts)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_report_cards_student_id ON report_cards(student_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_teacher_id ON report_cards(teacher_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_year_tri ON report_cards(academic_year, trimester);

-- ============================================================
-- Richmond Sync Log (status queries)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_richmond_sync_status ON richmond_sync_log(status)
  WHERE status = 'in_progress';

COMMENT ON INDEX idx_richmond_sync_status IS
  'Partial index for finding active sync operations only (most queries filter WHERE status = in_progress)';

-- ============================================================
-- Verification Queries (run after migration)
-- ============================================================

-- Verify indexes are being used (run EXPLAIN ANALYZE on these):
-- EXPLAIN ANALYZE SELECT * FROM students WHERE group_id = '<uuid>';
-- EXPLAIN ANALYZE SELECT * FROM materials WHERE lesson_plan_id = '<uuid>';
-- EXPLAIN ANALYZE SELECT * FROM lesson_plans WHERE fortnight_id = '<uuid>';

-- Expected output: "Index Scan using idx_..." not "Seq Scan on ..."
