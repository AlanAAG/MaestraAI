-- Migration 032: Richmond interactive (e-book) unit content
-- Stores raw content captured by the Chrome extension from Richmond LRP e-book pages
-- URL pattern: https://richmondlp.com/api/interactives/[uuid]

CREATE TABLE IF NOT EXISTS richmond_interactive_content (
  interactive_uuid  TEXT        PRIMARY KEY,
  teacher_id        UUID        REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
  title             TEXT,
  content_raw       JSONB       NOT NULL DEFAULT '{}'::jsonb,
  captured_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE richmond_interactive_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage their own interactive content"
  ON richmond_interactive_content
  FOR ALL
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE auth_id = auth.uid()
    )
  );

CREATE INDEX idx_richmond_interactive_teacher ON richmond_interactive_content(teacher_id);
CREATE INDEX idx_richmond_interactive_title ON richmond_interactive_content(title);
