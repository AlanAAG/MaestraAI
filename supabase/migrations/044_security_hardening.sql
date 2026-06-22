-- Migration 044: Security hardening
-- Date: 2026-06-21
-- Fixes from the multi-tenant security audit:
--   1. Privilege escalation: any teacher could UPDATE their own role_type to 'admin'
--      (teacher_self was FOR ALL USING(auth_id=auth.uid()) with no WITH CHECK / column guard).
--   2. archive_old_audit_logs was EXECUTE-able by PUBLIC (any user could purge forensic logs).
--   3. Dead legacy columns left around.
--   4. schools onboarding picker: expose existing schools (so users join instead of duplicating)
--      via a minimal SECURITY DEFINER RPC returning only id/name/state — without making the whole
--      schools table (incl. `plan` = customer/revenue list) readable to every authenticated user.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Prevent self privilege escalation on teachers.role_type
-- ─────────────────────────────────────────────────────────────────────────────
-- RLS can't reference OLD, so enforce the role_type immutability with a trigger.
-- A teacher (auth.uid() = their own auth_id) may update their row but NOT change role_type.
-- Service-role paths (auth.uid() IS NULL) and future admin RPCs can still change it.
CREATE OR REPLACE FUNCTION prevent_role_self_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.auth_id
     AND NEW.role_type IS DISTINCT FROM OLD.role_type THEN
    RAISE EXCEPTION 'role_type cannot be changed by the account holder';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_self_change ON teachers;
CREATE TRIGGER trg_prevent_role_self_change
  BEFORE UPDATE ON teachers
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_self_change();

-- Add explicit WITH CHECK to teacher_self so writes are bound to the owner (hardening;
-- Postgres copies USING into the check for FOR ALL, this just makes it explicit/future-proof).
DROP POLICY IF EXISTS teacher_self ON teachers;
CREATE POLICY teacher_self ON teachers FOR ALL
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Lock down archive_old_audit_logs (was EXECUTE to PUBLIC, no search_path pin)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER FUNCTION archive_old_audit_logs() SET search_path = public;
REVOKE EXECUTE ON FUNCTION archive_old_audit_logs() FROM PUBLIC;
-- Intended caller is the cron route via the service role, which bypasses GRANTs.

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Drop dead legacy columns (verified no app code reads them)
-- ─────────────────────────────────────────────────────────────────────────────
-- teachers.role (001) superseded by role_type (010); all authz reads role_type.
ALTER TABLE teachers DROP COLUMN IF EXISTS role;
-- vocabulary_items.color_code / color_hex (legacy) superseded by `color` (021).
ALTER TABLE vocabulary_items DROP COLUMN IF EXISTS color_code;
ALTER TABLE vocabulary_items DROP COLUMN IF EXISTS color_hex;
-- NOTE: richmond_scores.first_name/last_name plaintext drop is in 045 (still written by
-- import-batch; that write is fixed to encrypt in 045 before the columns are removed).

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. schools: replace world-readable SELECT (043) with a minimal onboarding RPC
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS schools_read_all ON schools;  -- defensive: never created in prod
-- school_via_teacher (004) remains: a teacher still reads only their own school directly.

-- Onboarding needs to list existing schools to avoid duplicates, but must NOT expose
-- `plan` (revenue/customer list). Return only the columns the picker needs.
CREATE OR REPLACE FUNCTION list_schools_for_onboarding()
RETURNS TABLE (id UUID, name TEXT, state TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, state FROM schools ORDER BY name;
$$;

REVOKE EXECUTE ON FUNCTION list_schools_for_onboarding() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION list_schools_for_onboarding() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Drop the misleading anon diary policy
-- ─────────────────────────────────────────────────────────────────────────────
-- "Public view shared diaries via token" (017) did NOT bind the token value — it only
-- checked that *a* token exists. The real anon read paths use the service-role client with
-- an explicit WHERE share_token = $1, so this policy is dead weight that reads as protection.
DROP POLICY IF EXISTS "Public view shared diaries via token" ON teacher_diary;
