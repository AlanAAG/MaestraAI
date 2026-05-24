-- Migration 005: usage_logs table for feature usage tracking per billing period

CREATE TABLE usage_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   UUID REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
  feature      TEXT NOT NULL,
  count        INT DEFAULT 1,
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, feature, period_start)
);

-- Index for fast lookups by teacher and period
CREATE INDEX idx_usage_logs_teacher_period ON usage_logs(teacher_id, period_start, period_end);

-- RLS: teachers can only view their own usage logs
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view own usage logs"
  ON usage_logs
  FOR SELECT
  USING (auth.uid() IN (SELECT auth_id FROM teachers WHERE id = usage_logs.teacher_id));

CREATE POLICY "System can insert usage logs"
  ON usage_logs
  FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT auth_id FROM teachers WHERE id = usage_logs.teacher_id));

CREATE POLICY "System can update usage logs"
  ON usage_logs
  FOR UPDATE
  USING (auth.uid() IN (SELECT auth_id FROM teachers WHERE id = usage_logs.teacher_id));
