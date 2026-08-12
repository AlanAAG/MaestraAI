-- Reference files the teacher attaches at plan creation (calendar, book pages, school docs).
-- Stored as EXTRACTED TEXT (not the file) — the AI consumes text; no bucket needed.
alter table fortnights add column if not exists attachment_context jsonb;
