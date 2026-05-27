-- Migration 008: Add vocabulary column to lesson_plans table
-- Author: Claude Code + Alan
-- Date: 2026-05-27
-- Purpose: Track vocabulary items per lesson day for material generation

-- Add vocabulary column to store daily vocabulary words
ALTER TABLE lesson_plans
ADD COLUMN IF NOT EXISTS vocabulary TEXT[] DEFAULT '{}';

-- Create index for vocabulary searches
CREATE INDEX IF NOT EXISTS idx_lesson_plans_vocabulary
ON lesson_plans USING GIN (vocabulary);

-- Add comment
COMMENT ON COLUMN lesson_plans.vocabulary IS
'Array of vocabulary words to be taught on this day. Used for generating flashcards, worksheets, and games.';
