-- Parent contacts for Richmond student email notifications
CREATE TABLE IF NOT EXISTS parent_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  richmond_student_id text NOT NULL,
  student_first_name text,
  student_last_name text,
  parent_name text,
  parent_email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(teacher_id, richmond_student_id)
);

ALTER TABLE parent_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher_own_contacts" ON parent_contacts
  FOR ALL USING (
    teacher_id = (SELECT id FROM teachers WHERE auth_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_parent_contacts_teacher_group
  ON parent_contacts (teacher_id, group_id);
