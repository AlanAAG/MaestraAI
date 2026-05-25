-- Migration 006: Richmond sync tables

-- Table: richmond_credentials
-- Stores encrypted Richmond session cookies per group
CREATE TABLE richmond_credentials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  teacher_id      UUID REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
  session_encrypted TEXT NOT NULL,
  expires_at      TIMESTAMPTZ,
  is_valid        BOOLEAN DEFAULT TRUE,
  last_validated  TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id)
);

-- Table: richmond_sync_log
-- Logs each sync operation
CREATE TABLE richmond_sync_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  teacher_id      UUID REFERENCES teachers(id) NOT NULL,
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'in_progress',
  assignments_synced INT DEFAULT 0,
  scores_synced   INT DEFAULT 0,
  error_message   TEXT,
  source          TEXT DEFAULT 'manual'
);

-- Table: richmond_assignments
-- Stores assignments from Richmond
CREATE TABLE richmond_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  richmond_id     TEXT NOT NULL,
  title           TEXT NOT NULL,
  instructions    TEXT,
  assigned_at     TIMESTAMPTZ NOT NULL,
  due_at          TIMESTAMPTZ NOT NULL,
  total_students  INT NOT NULL DEFAULT 0,
  total_submitted INT NOT NULL DEFAULT 0,
  class_avg_score NUMERIC(5,2),
  is_test         BOOLEAN DEFAULT FALSE,
  synced_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, richmond_id)
);

-- Table: richmond_scores
-- Stores individual student scores for each assignment
CREATE TABLE richmond_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id       UUID REFERENCES richmond_assignments(id) ON DELETE CASCADE NOT NULL,
  student_id          UUID REFERENCES students(id) ON DELETE CASCADE,
  richmond_student_id TEXT,
  first_name          TEXT NOT NULL,
  last_name           TEXT NOT NULL,
  progress            TEXT NOT NULL,
  total_score         NUMERIC(5,2),
  done                BOOLEAN DEFAULT FALSE,
  synced_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assignment_id, richmond_student_id)
);

-- Indexes for performance
CREATE INDEX idx_richmond_credentials_group ON richmond_credentials(group_id);
CREATE INDEX idx_richmond_sync_log_group ON richmond_sync_log(group_id, started_at DESC);
CREATE INDEX idx_richmond_assignments_group ON richmond_assignments(group_id, due_at DESC);
CREATE INDEX idx_richmond_scores_assignment ON richmond_scores(assignment_id);
CREATE INDEX idx_richmond_scores_student ON richmond_scores(student_id);

-- RLS policies
ALTER TABLE richmond_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE richmond_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE richmond_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE richmond_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view own group credentials"
  ON richmond_credentials FOR SELECT
  USING (auth.uid() IN (SELECT auth_id FROM teachers WHERE id = richmond_credentials.teacher_id));

CREATE POLICY "Teachers can manage own group credentials"
  ON richmond_credentials FOR ALL
  USING (auth.uid() IN (SELECT auth_id FROM teachers WHERE id = richmond_credentials.teacher_id));

CREATE POLICY "Teachers can view own sync logs"
  ON richmond_sync_log FOR SELECT
  USING (auth.uid() IN (SELECT auth_id FROM teachers WHERE id = richmond_sync_log.teacher_id));

CREATE POLICY "System can insert sync logs"
  ON richmond_sync_log FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT auth_id FROM teachers WHERE id = richmond_sync_log.teacher_id));

CREATE POLICY "System can update sync logs"
  ON richmond_sync_log FOR UPDATE
  USING (auth.uid() IN (SELECT auth_id FROM teachers WHERE id = richmond_sync_log.teacher_id));

CREATE POLICY "Teachers can view own group assignments"
  ON richmond_assignments FOR SELECT
  USING (
    group_id IN (
      SELECT g.id FROM groups g
      JOIN teachers t ON t.id = g.titular_teacher_id
      WHERE t.auth_id = auth.uid()
    )
  );

CREATE POLICY "System can manage assignments"
  ON richmond_assignments FOR ALL
  USING (
    group_id IN (
      SELECT g.id FROM groups g
      JOIN teachers t ON t.id = g.titular_teacher_id
      WHERE t.auth_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view own students scores"
  ON richmond_scores FOR SELECT
  USING (
    assignment_id IN (
      SELECT a.id FROM richmond_assignments a
      JOIN groups g ON g.id = a.group_id
      JOIN teachers t ON t.id = g.titular_teacher_id
      WHERE t.auth_id = auth.uid()
    )
  );

CREATE POLICY "System can manage scores"
  ON richmond_scores FOR ALL
  USING (
    assignment_id IN (
      SELECT a.id FROM richmond_assignments a
      JOIN groups g ON g.id = a.group_id
      JOIN teachers t ON t.id = g.titular_teacher_id
      WHERE t.auth_id = auth.uid()
    )
  );
