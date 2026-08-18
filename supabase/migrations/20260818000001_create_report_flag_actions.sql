-- Migration: Create report_flag_actions table for rate limiting the flag/unflag action
--
-- The flagReport Server Action is capped at 30 actions per 24h. Previously the
-- limit counted live report_flags rows, but unflagging deletes the row, so a
-- user could flag -> unflag -> re-flag indefinitely (each re-flag firing admin
-- notifications). This table records every flag AND unflag action so the limit
-- counts actual actions, not active rows. RLS is enabled with no policies
-- (service-role only access path, same as test_sms_log / api_request_log).

CREATE TABLE report_flag_actions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_id   uuid        NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  action      text        NOT NULL CHECK (action IN ('FLAGGED', 'UNFLAGGED')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE report_flag_actions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_report_flag_actions_user_created ON report_flag_actions(user_id, created_at);