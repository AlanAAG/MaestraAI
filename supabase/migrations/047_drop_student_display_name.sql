-- 047_drop_student_display_name.sql
-- Remove the plaintext student name column. Student names are now stored ONLY as
-- AES-256-GCM ciphertext (first_name_encrypted / last_name_encrypted) and decrypted
-- server-side wherever shown (see lib/students/name.ts + /api/students*).
-- This drops the last plaintext copy of minors' names from the database.

ALTER TABLE students DROP COLUMN IF EXISTS display_name;
