-- Migration 045: PII encryption follow-through
-- Date: 2026-06-21
--
-- (a) teacher_diary q1..q5 now store AES-256-GCM ciphertext (encrypted in app/api/diary/save).
--     These columns are write-only (no UI reads them back), so this is a storage-format change
--     only — no schema change. Run scripts/backfill-diary-encryption.ts ONCE for pre-existing rows.
--     ai_summary stays plaintext on purpose: it is the student-name-redacted, publicly-shareable
--     summary, read by browser clients that hold no decryption key.
--
-- (b) richmond_scores plaintext name columns: every writer now encrypts into *_encrypted
--     (ingest, upload-xlsx already did; import-batch fixed in this change). The legacy plaintext
--     columns were nulled in migration 030 — drop them so no minors' names sit in plaintext.

ALTER TABLE richmond_scores DROP COLUMN IF EXISTS first_name;
ALTER TABLE richmond_scores DROP COLUMN IF EXISTS last_name;

COMMENT ON COLUMN teacher_diary.q5_student_obs IS
  'AES-256-GCM ciphertext (raw student observations). Encrypted at rest since migration 045.';
