-- 007_multi_tenant_setup.sql
-- Adds per-user API keys, Richmond group mapping, and teacher-scoped vocabulary

-- ============================================================
-- API Keys table for per-teacher authentication
-- ============================================================
CREATE TABLE api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  name text NOT NULL, -- e.g., "Chrome Extension - MacBook"
  key_prefix text NOT NULL, -- First 11 chars for display (mk_abc123de)
  key_hash text NOT NULL, -- bcrypt hash of full key
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  CONSTRAINT unique_key_prefix UNIQUE(key_prefix)
);

CREATE INDEX idx_api_keys_teacher ON api_keys(teacher_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE revoked_at IS NULL;

-- RLS policies for api_keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view own API keys"
  ON api_keys FOR SELECT
  USING (teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid()));

CREATE POLICY "Teachers can create own API keys"
  ON api_keys FOR INSERT
  WITH CHECK (teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid()));

CREATE POLICY "Teachers can revoke own API keys"
  ON api_keys FOR UPDATE
  USING (teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid()));

-- ============================================================
-- Add Richmond group slug for extension mapping
-- ============================================================
ALTER TABLE groups ADD COLUMN richmond_group_slug text;
CREATE UNIQUE INDEX idx_groups_richmond_slug ON groups(richmond_group_slug)
  WHERE richmond_group_slug IS NOT NULL;

COMMENT ON COLUMN groups.richmond_group_slug IS
  'Richmond LP course slug (e.g., "grupo-aca6e") for Chrome extension mapping';

-- ============================================================
-- Make vocabulary per-teacher (not global)
-- ============================================================
ALTER TABLE vocabulary_items ADD COLUMN teacher_id uuid REFERENCES teachers(id) ON DELETE CASCADE;
CREATE INDEX idx_vocabulary_teacher ON vocabulary_items(teacher_id);

COMMENT ON COLUMN vocabulary_items.teacher_id IS
  'If NULL, vocabulary is global (seeded). If set, vocabulary is teacher-specific.';

-- ============================================================
-- Add grade and editorial to teachers (save onboarding data)
-- ============================================================
ALTER TABLE teachers ADD COLUMN grade text;
ALTER TABLE teachers ADD COLUMN editorial text;

COMMENT ON COLUMN teachers.grade IS 'Grade taught (e.g., "Kinder 3") - collected during onboarding';
COMMENT ON COLUMN teachers.editorial IS 'Editorial used (e.g., "Richmond") - collected during onboarding';
