ALTER TABLE fortnights
  ADD COLUMN IF NOT EXISTS physical_materials TEXT[] DEFAULT '{}';
