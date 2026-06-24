-- Per-planeación choice: use the teacher's uploaded format, or MaestraIA's built-in design.
-- Default false = use the teacher's format (current behavior). The create flow sets this
-- best-effort, so generation/creation degrade gracefully until this is pushed.
ALTER TABLE fortnights ADD COLUMN IF NOT EXISTS use_system_template boolean NOT NULL DEFAULT false;
