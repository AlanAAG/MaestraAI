-- 068: Month (4-week) plans + teacher learning goal.
-- All columns nullable/defaulted and written best-effort by the app, so creation never breaks
-- before this migration is applied. We deliberately do NOT touch the plan_type CHECK constraint:
-- "Mes" plans store plan_type='quincena' + is_month=true, so only DB-legal plan_type values are
-- ever inserted (this is what fixes the 23514 fortnights_plan_type_check crash).

ALTER TABLE fortnights ADD COLUMN IF NOT EXISTS is_month boolean NOT NULL DEFAULT false;
ALTER TABLE fortnights ADD COLUMN IF NOT EXISTS letter_week3 text;
ALTER TABLE fortnights ADD COLUMN IF NOT EXISTS letter_week4 text;
ALTER TABLE fortnights ADD COLUMN IF NOT EXISTS learning_goal text;

COMMENT ON COLUMN fortnights.is_month IS
  'True for month-long (4-week) plans. plan_type stays quincena; this flag drives the 4-week behavior.';
COMMENT ON COLUMN fortnights.learning_goal IS
  'Teacher''s answer to "¿Qué quieres que aprendan los niños este mes/quincena?" — drives generation, not rendered as a section.';
