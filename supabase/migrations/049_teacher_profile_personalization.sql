-- Personalization fields on the teacher profile, used to tailor planeación + material generation.
-- `subject` already exists. Nullable; the GET/PATCH route degrades gracefully until this is pushed.
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS teaching_style text;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS profile_notes text;
