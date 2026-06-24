-- School logo (stored as a base64 data URL), used in the header of generated planeaciones + exports.
-- Nullable; the read route degrades gracefully (returns null) until this is pushed.
ALTER TABLE schools ADD COLUMN IF NOT EXISTS logo_url text;
