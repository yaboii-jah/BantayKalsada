-- Migration: Create report_flags table for citizen flagging
--
-- Citizens can flag approved/resolved reports as "Already fixed" or
-- "Wrong location" so admins can review and correct stale/mislocated reports.

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'REPORT_FLAGGED';

CREATE TYPE report_flag_type AS ENUM ('ALREADY_FIXED', 'WRONG_LOCATION');

CREATE TABLE report_flags (
  id         uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  uuid             NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id    uuid             NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flag_type  report_flag_type NOT NULL,
  created_at timestamptz      NOT NULL DEFAULT now(),

  CONSTRAINT report_flags_unique_per_user UNIQUE (report_id, user_id)
);

CREATE INDEX idx_report_flags_report_id ON report_flags(report_id);

ALTER TABLE report_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Citizens can insert flags"
  ON report_flags FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Citizens can read own flags"
  ON report_flags FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
