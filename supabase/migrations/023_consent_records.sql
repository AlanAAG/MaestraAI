CREATE TABLE consent_records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   UUID REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN (
    'primary_purposes', 'secondary_purposes', 'student_data_transfer'
  )),
  granted      BOOLEAN NOT NULL,
  ip_address   TEXT,
  user_agent   TEXT,
  granted_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insert_own" ON consent_records FOR INSERT
  WITH CHECK (teacher_id = (SELECT id FROM teachers WHERE auth_id = auth.uid()));

CREATE POLICY "select_own" ON consent_records FOR SELECT
  USING (teacher_id = (SELECT id FROM teachers WHERE auth_id = auth.uid()));
