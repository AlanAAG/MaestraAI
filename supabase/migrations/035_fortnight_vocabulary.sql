-- Add vocabulary selection to fortnights so teachers pre-pick words before generation
ALTER TABLE fortnights ADD COLUMN IF NOT EXISTS vocabulary TEXT[] DEFAULT '{}';
