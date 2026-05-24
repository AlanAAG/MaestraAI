-- Enable RLS on all tables
ALTER TABLE schools               ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups                ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_teachers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE students              ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fortnights            ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_plans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials             ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_observations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_cards          ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_diary         ENABLE ROW LEVEL SECURITY;

-- Vocabulary is public read (no sensitive data)
CREATE POLICY vocab_public_read ON vocabulary_items FOR SELECT USING (true);

-- Teachers: see only own record
CREATE POLICY teacher_self ON teachers FOR ALL
  USING (auth_id = auth.uid());

-- Schools: see own school via teacher record
CREATE POLICY school_via_teacher ON schools FOR SELECT USING (
  id IN (SELECT school_id FROM teachers WHERE auth_id = auth.uid())
);

-- Groups: titular teacher OR assigned extracurricular
CREATE POLICY group_access ON groups FOR ALL USING (
  titular_teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid())
  OR id IN (
    SELECT gt.group_id FROM group_teachers gt
    JOIN teachers t ON t.id = gt.teacher_id
    WHERE t.auth_id = auth.uid()
  )
);

-- Students: same group access logic
CREATE POLICY student_access ON students FOR ALL USING (
  group_id IN (
    SELECT g.id FROM groups g
    JOIN teachers t ON t.id = g.titular_teacher_id
    WHERE t.auth_id = auth.uid()
    UNION
    SELECT gt.group_id FROM group_teachers gt
    JOIN teachers t2 ON t2.id = gt.teacher_id
    WHERE t2.auth_id = auth.uid()
  )
);

-- Teacher diary: own records only
CREATE POLICY diary_own ON teacher_diary FOR ALL
  USING (teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid()));

-- Fortnights: own
CREATE POLICY fortnights_own ON fortnights FOR ALL
  USING (teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid()));

-- Lesson plans: own
CREATE POLICY lesson_plans_own ON lesson_plans FOR ALL
  USING (teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid()));

-- Materials: own
CREATE POLICY materials_own ON materials FOR ALL
  USING (teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid()));

-- Observations: own
CREATE POLICY observations_own ON teacher_observations FOR ALL
  USING (teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid()));

-- Report cards: own
CREATE POLICY report_cards_own ON report_cards FOR ALL
  USING (teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid()));

-- Group teachers: own assignments
CREATE POLICY group_teachers_own ON group_teachers FOR ALL
  USING (teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid()));
