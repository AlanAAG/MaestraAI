-- link_teacher_to_groups.sql
-- Run this AFTER creating your account via the UI to properly link everything

-- ============================================================
-- STEP 1: Find your teacher record
-- ============================================================
-- Replace 'your@email.com' with your actual email
SELECT
  id as teacher_id,
  auth_id,
  email,
  full_name,
  school_id,
  created_at
FROM teachers
WHERE email = 'your@email.com';

-- Copy the teacher_id from results above
-- ⬇️ USE THIS IN STEPS BELOW


-- ============================================================
-- STEP 2: Create or update school
-- ============================================================
-- Option A: Create new school
INSERT INTO schools (id, name, city, state)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',  -- Fixed UUID for testing
  'Escuela Americana',
  'Ciudad de México',
  'CDMX'
)
ON CONFLICT (id) DO NOTHING
RETURNING id, name;

-- Option B: Use existing school (check what schools exist)
SELECT id, name FROM schools;


-- ============================================================
-- STEP 3: Link teacher to school
-- ============================================================
-- Replace <TEACHER_ID> with ID from Step 1
UPDATE teachers
SET school_id = 'a1b2c3d4-0000-0000-0000-000000000001'
WHERE id = '<TEACHER_ID>';

-- Verify
SELECT id, email, full_name, school_id FROM teachers WHERE id = '<TEACHER_ID>';


-- ============================================================
-- STEP 4: Check existing groups
-- ============================================================
-- See what groups already exist
SELECT
  id,
  name,
  grade,
  titular_teacher_id,
  academic_year
FROM groups
ORDER BY name;


-- ============================================================
-- STEP 5: Link teacher to existing group (if group exists)
-- ============================================================
-- Option A: Update Grupo A (Preprimaria A)
-- Replace <TEACHER_ID> with ID from Step 1
UPDATE groups
SET titular_teacher_id = '<TEACHER_ID>'
WHERE id = '91000000-0000-0000-0000-000000000001';

-- Option B: Update Grupo B (Preprimaria B)
UPDATE groups
SET titular_teacher_id = '<TEACHER_ID>'
WHERE id = '92000000-0000-0000-0000-000000000002';

-- Verify
SELECT
  g.id,
  g.name,
  g.grade,
  t.full_name as teacher_name,
  t.email as teacher_email
FROM groups g
LEFT JOIN teachers t ON g.titular_teacher_id = t.id
WHERE g.titular_teacher_id = '<TEACHER_ID>';


-- ============================================================
-- STEP 6 (Optional): Create new group
-- ============================================================
-- Only if you need a NEW group (not using seeded ones)
-- Replace <TEACHER_ID> with ID from Step 1
INSERT INTO groups (
  school_id,
  titular_teacher_id,
  name,
  grade,
  academic_year
)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',  -- school_id
  '<TEACHER_ID>',                          -- your teacher_id
  'Kinder 3A',                             -- group name
  'Kinder 3',                              -- grade
  '2025-2026'                              -- academic year
)
RETURNING id, name, grade;


-- ============================================================
-- STEP 7: Verify complete setup
-- ============================================================
-- This should return your complete teacher profile
SELECT
  t.id as teacher_id,
  t.email,
  t.full_name,
  t.auth_id,
  s.name as school_name,
  COUNT(DISTINCT g.id) as groups_count
FROM teachers t
LEFT JOIN schools s ON t.school_id = s.id
LEFT JOIN groups g ON g.titular_teacher_id = t.id
WHERE t.email = 'your@email.com'
GROUP BY t.id, t.email, t.full_name, t.auth_id, s.name;

-- Should show:
-- - teacher_id: your UUID
-- - email: your email
-- - full_name: your name
-- - school_name: "Escuela Americana" (or NULL if not set)
-- - groups_count: 1 or more (or 0 if not linked)


-- ============================================================
-- STEP 8: Check students in your groups
-- ============================================================
-- Replace <TEACHER_ID> with ID from Step 1
SELECT
  g.name as group_name,
  COUNT(s.id) as student_count,
  COUNT(s.richmond_student_id) as students_with_richmond_id
FROM groups g
LEFT JOIN students s ON s.group_id = g.id
WHERE g.titular_teacher_id = '<TEACHER_ID>'
GROUP BY g.id, g.name;

-- Should show:
-- Preprimaria A: 12 students, 12 with Richmond IDs
-- Preprimaria B: 12 students, 12 with Richmond IDs
-- (If you ran seed_step2.sql)


-- ============================================================
-- QUICK VERIFICATION QUERIES
-- ============================================================

-- 1. Is my auth_id correct?
SELECT
  (SELECT id FROM auth.users WHERE email = 'your@email.com') as auth_user_id,
  t.auth_id as teacher_auth_id,
  t.auth_id = (SELECT id FROM auth.users WHERE email = 'your@email.com') as ids_match
FROM teachers t
WHERE t.email = 'your@email.com';
-- ids_match should be TRUE


-- 2. Do I have groups?
SELECT COUNT(*) as my_groups_count
FROM groups
WHERE titular_teacher_id = (
  SELECT id FROM teachers WHERE email = 'your@email.com'
);
-- Should be > 0


-- 3. Can I create planeaciones?
SELECT
  CASE
    WHEN COUNT(g.id) > 0 THEN 'Ready to create planeaciones!'
    ELSE 'Need to link to a group first'
  END as status
FROM teachers t
LEFT JOIN groups g ON g.titular_teacher_id = t.id
WHERE t.email = 'your@email.com';


-- ============================================================
-- TROUBLESHOOTING
-- ============================================================

-- Problem: "No teacher found"
-- Solution: Check if teacher record exists
SELECT * FROM teachers WHERE email = 'your@email.com';
-- If no results: Complete onboarding wizard first


-- Problem: "No groups found"
-- Solution: Run Step 5 or Step 6 above


-- Problem: "auth_id mismatch"
-- Solution: Update teacher.auth_id to match auth.users.id
UPDATE teachers
SET auth_id = (SELECT id FROM auth.users WHERE email = 'your@email.com')
WHERE email = 'your@email.com';


-- Problem: "Planeación shows wrong group"
-- Solution: Group ID is currently hardcoded in code
-- Edit: app/(main)/planeaciones/nueva/page.tsx:73
-- This will be fixed in a future update to allow group selection
