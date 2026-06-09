-- Migration 022: Richmond credential encryption documentation and revocation support
-- Required for LFPDPPP compliance: Option A — disclose stored credentials accurately.

-- Document encryption on teacher-level Richmond credential fields
COMMENT ON COLUMN teachers.richmond_email_encrypted IS
  'AES-256-GCM encrypted Richmond LP email. NULL unless teacher enables server-side auto-sync. Teacher can delete from Settings → Richmond → Eliminar credenciales.';

COMMENT ON COLUMN teachers.richmond_password_encrypted IS
  'AES-256-GCM encrypted Richmond LP password. NULL unless teacher enables server-side auto-sync. Teacher can delete from Settings → Richmond → Eliminar credenciales.';

-- Document encryption on session-cookie credential table
COMMENT ON TABLE richmond_credentials IS
  'AES-256-GCM encrypted Richmond LP session cookies per group. Used for server-side sync under explicit teacher instruction. Teachers may revoke at any time from Settings.';

COMMENT ON COLUMN richmond_credentials.session_encrypted IS
  'AES-256-GCM encrypted Richmond session cookie. Decrypted server-side only during sync operations explicitly authorised by the teacher.';

-- Add explicit revocation timestamp for audit trail (LFPDPPP right of cancellation)
ALTER TABLE richmond_credentials
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

COMMENT ON COLUMN richmond_credentials.revoked_at IS
  'Set when teacher explicitly revokes stored session credential from Settings. NULL = active.';

-- Index to quickly find active (non-revoked) credentials per teacher
CREATE INDEX IF NOT EXISTS idx_richmond_credentials_teacher_active
  ON richmond_credentials(teacher_id)
  WHERE revoked_at IS NULL AND is_valid = TRUE;
