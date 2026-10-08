-- Freeze the teacher's format choice for each plan instead of silently switching to the
-- newest template when several formats have been uploaded.
ALTER TABLE fortnights
  ADD COLUMN IF NOT EXISTS format_template_id uuid
  REFERENCES teacher_plan_templates(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS fortnights_format_template_idx
  ON fortnights(format_template_id) WHERE format_template_id IS NOT NULL;
