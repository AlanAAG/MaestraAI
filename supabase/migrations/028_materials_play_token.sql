ALTER TABLE materials ADD COLUMN IF NOT EXISTS play_token TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS materials_play_token_idx ON materials(play_token);
