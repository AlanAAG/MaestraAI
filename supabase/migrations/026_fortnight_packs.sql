CREATE TABLE IF NOT EXISTS fortnight_packs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id    UUID REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
  fortnight_id  UUID REFERENCES fortnights(id) ON DELETE CASCADE NOT NULL,
  material_ids  UUID[] NOT NULL DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'generating', 'ready', 'error')),
  error_msg     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE fortnight_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher owns pack"
  ON fortnight_packs FOR ALL
  USING (teacher_id = (SELECT id FROM teachers WHERE auth_id = auth.uid()));

CREATE INDEX IF NOT EXISTS fortnight_packs_fortnight_id_idx ON fortnight_packs(fortnight_id);
CREATE INDEX IF NOT EXISTS fortnight_packs_teacher_id_idx ON fortnight_packs(teacher_id);
