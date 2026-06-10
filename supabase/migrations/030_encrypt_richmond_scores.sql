-- Migration 030: Encrypt richmond_scores names (LFPDPPP compliance)
-- richmond_scores.first_name and last_name were stored in plaintext.
-- These are minors' real names — violation of LFPDPPP Art. 9.
-- Encryption happens in the application layer (lib/encryption.ts, AES-256-GCM).

ALTER TABLE richmond_scores
  ADD COLUMN IF NOT EXISTS first_name_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS last_name_encrypted  TEXT;

-- Nullify existing plaintext rows.
-- Names are redundant: matched students have their names in students.first_name_encrypted.
-- Unmatched students lose their plaintext names here; they can be re-synced via the extension.
UPDATE richmond_scores
SET first_name = NULL,
    last_name  = NULL;

-- Make plaintext columns nullable so existing code doesn't break on INSERT
ALTER TABLE richmond_scores ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE richmond_scores ALTER COLUMN last_name  DROP NOT NULL;
