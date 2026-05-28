-- Migration 011: Audit Logging & Security Monitoring
-- Adds: audit logs for sensitive actions, failed auth tracking

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE audit_logs IS 'Audit trail for sensitive actions (API key usage, data exports, deletions)';
COMMENT ON COLUMN audit_logs.action IS 'Format: resource.action (e.g., api_key.create, fortnight.delete)';
COMMENT ON COLUMN audit_logs.metadata IS 'Contextual data (grade, group, file size, etc.)';

-- Failed authentication attempts table
CREATE TABLE failed_auth_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE failed_auth_attempts IS 'Security monitoring: track failed login attempts for rate limiting';
COMMENT ON COLUMN failed_auth_attempts.reason IS 'invalid_credentials, email_not_confirmed, account_locked, etc.';

-- Create indexes for efficient querying
CREATE INDEX idx_audit_logs_teacher ON audit_logs(teacher_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_failed_auth_ip ON failed_auth_attempts(ip_address, created_at DESC);
CREATE INDEX idx_failed_auth_email ON failed_auth_attempts(email, created_at DESC);

-- RLS Policies
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_auth_attempts ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs for their school
CREATE POLICY "Admins view audit logs" ON audit_logs
  FOR SELECT USING (
    teacher_id IN (
      SELECT t.id FROM teachers t
      WHERE t.school_id = (
        SELECT school_id FROM teachers WHERE auth_id = auth.uid() AND role_type = 'admin'
      )
    )
  );

-- Only admins can view failed auth attempts (security monitoring)
CREATE POLICY "Admins view failed auth" ON failed_auth_attempts
  FOR SELECT USING (
    email IN (
      SELECT t.email FROM teachers t
      WHERE t.school_id = (
        SELECT school_id FROM teachers WHERE auth_id = auth.uid() AND role_type = 'admin'
      )
    )
  );

-- Service role can insert audit logs (backend only)
CREATE POLICY "Service inserts audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- Service role can insert failed auth attempts (backend only)
CREATE POLICY "Service inserts failed auth" ON failed_auth_attempts
  FOR INSERT WITH CHECK (true);

-- Cleanup function: archive old audit logs (run monthly via cron)
CREATE OR REPLACE FUNCTION archive_old_audit_logs()
RETURNS void AS $$
BEGIN
  -- Delete audit logs older than 6 months
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '6 months';

  -- Delete failed auth attempts older than 30 days
  DELETE FROM failed_auth_attempts
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION archive_old_audit_logs() IS 'Monthly cleanup: removes audit logs >6mo, failed auth >30d';
