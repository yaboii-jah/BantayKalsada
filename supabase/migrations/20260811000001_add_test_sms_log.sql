-- Migration: Create test_sms_log table for rate limiting the "Send Test SMS" action
--
-- PhilSMS sends are per-message paid, so sendTestSms must be throttled to
-- prevent a logged-in user from racking up charges. The table counts test
-- SMS sends per user. RLS is enabled with no policies (service-role only
-- access path, same as api_request_log / report_activity_log).

CREATE TABLE test_sms_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE test_sms_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_test_sms_log_user_created ON test_sms_log(user_id, created_at);