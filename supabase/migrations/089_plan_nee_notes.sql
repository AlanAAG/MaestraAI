-- Per-plan NEE description, written by the teacher in her own words.
--
-- Until now the ONLY way to tell the generator about a student needing ajustes razonables was
-- to build the full student roster and flag a student (students.has_nee + nee_notes_encrypted).
-- That is a heavy prerequisite — it means entering minors' names — for a teacher who just wants
-- to say "tengo dos niños con TDAH". Plans for groups with an empty roster always came back
-- saying the group had no NEE, which is what the teacher reported.
--
-- Free text, no names: the UI asks for support needs only, and the server scrubs capitalised
-- name-shaped sequences before the text can reach the model (same treatment as the per-student
-- notes). Plain text rather than encrypted: it holds no identifiers, only pedagogical needs.
alter table fortnights
  add column if not exists nee_notes text;

comment on column fortnights.nee_notes is
  'Teacher-written NEE cases for this plan (no names). Feeds ajustes_razonables alongside students.has_nee.';
