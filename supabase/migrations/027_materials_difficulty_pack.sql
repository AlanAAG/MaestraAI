ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS difficulty_level TEXT
    CHECK (difficulty_level IN ('kinder', 'standard'))
    DEFAULT 'kinder',
  ADD COLUMN IF NOT EXISTS fortnight_pack_id UUID REFERENCES fortnight_packs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS materials_fortnight_pack_id_idx ON materials(fortnight_pack_id);
