-- Migration: Create report_activity_log table for admin audit trail
--
-- Records every meaningful event in a report's lifecycle: submission, edits,
-- status transitions, comment removals, duplicate linking, and merges.
-- This is the authoritative audit trail backing the lifecycle timeline UI.
-- Service-role only (no RLS policies) — consistent with api_request_log.

CREATE TYPE report_activity_action AS ENUM (
  'SUBMITTED',
  'EDITED',
  'APPROVED',
  'REJECTED',
  'RESOLVED',
  'DUPLICATE_LINKED',
  'MERGED',
  'COMMENT_REMOVED'
);

CREATE TABLE report_activity_log (
  id         uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  uuid                   NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  actor_id   uuid                   NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action     report_activity_action NOT NULL,
  detail     jsonb                  NULL,
  created_at timestamptz            NOT NULL DEFAULT now()
);

ALTER TABLE report_activity_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_report_activity_log_report_created
  ON report_activity_log(report_id, created_at);
