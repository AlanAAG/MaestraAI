-- Parent accounts: a teacher invites a student's parent by email; the parent creates a normal
-- Supabase auth account and claims the invite token, which binds their auth id to one student.
-- Parents are NOT teachers — no change to teachers.role_type or any existing policy. This table
-- is the entire authorization model for the /familia area.

CREATE TABLE parent_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_auth_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- null until claimed
  invite_token text UNIQUE NOT NULL,             -- 32-hex, crypto.randomUUID sans dashes (mirrors play_token)
  invite_email_encrypted text NOT NULL,          -- AES-256-GCM (lib/encryption.ts) — teacher's record only
  expires_at timestamptz NOT NULL,               -- unclaimed invites expire (7 days)
  claimed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One active claimed link per (student, parent); NULLs don't collide so a teacher can re-invite.
CREATE UNIQUE INDEX parent_links_claim_unique
  ON parent_links (student_id, parent_auth_id)
  WHERE parent_auth_id IS NOT NULL AND revoked_at IS NULL;

CREATE INDEX parent_links_parent_idx ON parent_links (parent_auth_id) WHERE parent_auth_id IS NOT NULL;
CREATE INDEX parent_links_teacher_idx ON parent_links (teacher_id);

ALTER TABLE parent_links ENABLE ROW LEVEL SECURITY;

-- Teacher manages their own links (mint / list / revoke).
CREATE POLICY parent_links_teacher ON parent_links FOR ALL
  USING (teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid()))
  WITH CHECK (teacher_id IN (SELECT id FROM teachers WHERE auth_id = auth.uid()));

-- Parent reads their own claimed links. Claim itself happens via service role (token = credential).
CREATE POLICY parent_links_parent ON parent_links FOR SELECT
  USING (parent_auth_id = auth.uid());

-- Explicit teacher opt-in per material; play_token alone also powers classroom projection,
-- so sharing-with-families is its own flag.
ALTER TABLE materials ADD COLUMN shared_with_parents boolean NOT NULL DEFAULT false;

COMMENT ON TABLE parent_links IS
  'Parent↔student bindings. Invite minted by teacher, claimed by parent auth user. Revocation = revoked_at set.';
