-- Per-teacher document design preferences (font, size, accent color, line intensity) applied
-- to the planeación document. Nullable jsonb; the viewer falls back to defaults when absent.
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS design_settings jsonb;
