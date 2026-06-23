-- Account-level (per-teacher) email template for parent homework-reminder notifications.
-- Shape: { "subject": "...", "body": "..." } with placeholders {padre}, {alumno}, {tareas}.
-- Nullable: when NULL, the notify routes fall back to the built-in default template
-- (lib/calificaciones/notify.ts DEFAULT_TEMPLATE), so behavior is unchanged until a teacher edits it.
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS parent_email_template jsonb;
