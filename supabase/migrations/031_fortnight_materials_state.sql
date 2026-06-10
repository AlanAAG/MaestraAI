-- Migration 031: Add materials_state to fortnight_packs for resumable full-fortnight generation
ALTER TABLE fortnight_packs
  ADD COLUMN IF NOT EXISTS materials_state JSONB DEFAULT '{}'::jsonb;
-- Shape: { "1": "pending" | "done" | "failed", "2": "done", ... }
-- Keyed by day_number (as string). Missing key = not started.
