-- Per-student NEE (special-educational-needs) support notes — areas of support + optional
-- therapist note. Sensitive (disability) PII, so stored ENCRYPTED at rest (mirrors
-- first_name_encrypted). Fed ANONYMIZED + name-scrubbed into ajustes_razonables generation.
-- Additive + nullable: the generate route reads it best-effort, so it's safe before this is pushed.
alter table students add column if not exists nee_notes_encrypted text;
