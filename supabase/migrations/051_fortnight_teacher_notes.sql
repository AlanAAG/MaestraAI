-- Optional free-text the teacher can add when creating a planeación: general requests
-- (specific activities/games/materials) and project-specific ideas. Both feed generation.
-- Nullable; set best-effort by the create flow so creation never breaks before this is pushed.
ALTER TABLE fortnights ADD COLUMN IF NOT EXISTS teacher_notes text;
ALTER TABLE fortnights ADD COLUMN IF NOT EXISTS project_notes text;
