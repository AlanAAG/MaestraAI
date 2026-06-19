-- Migration 042: Document-style planeacion support
-- Adds plan_type, plan_document, observation_calendar, richmond_book_pages to fortnights
-- Creates teacher_plan_templates for per-teacher multi-format template storage

ALTER TABLE fortnights
  ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'quincena'
    CHECK (plan_type IN ('quincena','taller')),
  ADD COLUMN IF NOT EXISTS plan_document JSONB,
  ADD COLUMN IF NOT EXISTS observation_calendar JSONB,
  ADD COLUMN IF NOT EXISTS richmond_book_pages JSONB;

CREATE TABLE IF NOT EXISTS teacher_plan_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'quincena' CHECK (plan_type IN ('quincena','taller')),
  template JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE teacher_plan_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher_plan_templates_own" ON teacher_plan_templates
  FOR ALL USING (
    teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_tpt_teacher
  ON teacher_plan_templates(teacher_id, plan_type, created_at DESC);
