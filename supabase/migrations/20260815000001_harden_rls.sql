-- Migration: Security hardening for RLS policies
--
-- Addresses findings from the 2026-08-15 security audit:
--   1. reports: WITH CHECK on the citizen UPDATE policy did not require
--      status = 'PENDING', so a citizen could self-approve/self-reject their
--      own pending report (and set admin-only fields) via PostgREST.
--   2. municipality_boundaries: RLS was never enabled, so anon/authenticated
--      could INSERT/UPDATE/DELETE the Taytay polygon -> geo-scope bypass or
--      full DoS of the submission flow.
--   3. profiles: the UPDATE policy is owner-scoped but column-unrestricted, so
--      a citizen could set role = 'ADMIN' on their own row. Citizens only need
--      to update phone/sms_notifications/full_name, so UPDATE is revoked and
--      re-granted at column level.
--   4. report_comments: an author could re-activate a REMOVED comment or move
--      it to a non-public report. Update now requires status = 'ACTIVE' and a
--      public target report.
--   5. report_flags: flags could be created/pointed at non-public reports.

-- 1. reports - keep pending reports pending while citizens edit them
DROP POLICY IF EXISTS "Citizens can update their own pending reports" ON reports;

CREATE POLICY "Citizens can update their own pending reports"
  ON reports FOR UPDATE
  TO authenticated
  USING (auth.uid() = submitted_by_id AND status = 'PENDING')
  WITH CHECK (auth.uid() = submitted_by_id AND status = 'PENDING');

-- 2. municipality_boundaries - public geography, but writable only by admins
ALTER TABLE municipality_boundaries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON municipality_boundaries FROM anon, authenticated;

-- 3. profiles - restrict citizen updates to safe columns
REVOKE UPDATE ON profiles FROM authenticated;

GRANT UPDATE (phone, sms_notifications, full_name) ON profiles TO authenticated;

-- 4. report_comments - authors can edit active comments on public reports only
DROP POLICY IF EXISTS "Users can update own comments" ON report_comments;

CREATE POLICY "Users can update own comments"
  ON report_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'ACTIVE')
  WITH CHECK (
    auth.uid() = user_id AND status = 'ACTIVE' AND EXISTS (
      SELECT 1 FROM reports
      WHERE reports.id = report_id
      AND reports.status IN ('APPROVED', 'RESOLVED')
    )
  );

-- 5. report_flags - flags target approved/resolved reports only
DROP POLICY IF EXISTS "Citizens can insert flags" ON report_flags;

CREATE POLICY "Citizens can insert flags"
  ON report_flags FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM reports
      WHERE reports.id = report_id
      AND reports.status IN ('APPROVED', 'RESOLVED')
    )
  );

DROP POLICY IF EXISTS "Citizens can update own flags" ON report_flags;

CREATE POLICY "Citizens can update own flags"
  ON report_flags FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM reports
      WHERE reports.id = report_id
      AND reports.status IN ('APPROVED', 'RESOLVED')
    )
  );
