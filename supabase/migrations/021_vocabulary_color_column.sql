-- Migration 021: Add color column to vocabulary_items
-- The original schema used color_code (Spanish names like 'azul') and color_hex.
-- The API and UI both expect a single 'color' column with English enum values.
-- This migration adds the column and backfills from existing color_code values.

ALTER TABLE vocabulary_items
  ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT 'blue';

-- Drop NOT NULL on legacy columns so new seed can omit them
ALTER TABLE vocabulary_items ALTER COLUMN color_code DROP NOT NULL;
ALTER TABLE vocabulary_items ALTER COLUMN color_hex DROP NOT NULL;
ALTER TABLE vocabulary_items ALTER COLUMN pair_index DROP NOT NULL;

UPDATE vocabulary_items SET color = CASE color_code
  WHEN 'azul'     THEN 'blue'
  WHEN 'amarillo' THEN 'yellow'
  WHEN 'rojo'     THEN 'red'
  WHEN 'verde'    THEN 'green'
  WHEN 'morado'   THEN 'purple'
  WHEN 'rosa'     THEN 'pink'
  WHEN 'naranja'  THEN 'orange'
  ELSE 'blue'
END
WHERE color_code IS NOT NULL;
