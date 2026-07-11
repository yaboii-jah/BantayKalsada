-- Migration: Add report_comments table

CREATE TYPE comment_status AS ENUM ('ACTIVE', 'REMOVED');

CREATE TABLE report_comments (
  id          uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   uuid            NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id     uuid            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id   uuid            NULL REFERENCES report_comments(id) ON DELETE CASCADE,
  body        text            NOT NULL,
  status      comment_status  NOT NULL DEFAULT 'ACTIVE',
  created_at  timestamptz     NOT NULL DEFAULT now(),
  updated_at  timestamptz     NOT NULL DEFAULT now(),

  CONSTRAINT comment_body_length CHECK (char_length(body) >= 1 AND char_length(body) <= 2000)
);

ALTER TABLE report_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active comments on approved reports"
  ON report_comments FOR SELECT
  USING (
    status = 'ACTIVE' AND EXISTS (
      SELECT 1 FROM reports WHERE reports.id = report_id AND reports.status IN ('APPROVED', 'RESOLVED')
    )
  );

CREATE POLICY "Authenticated users can insert comments"
  ON report_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON report_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND status = 'ACTIVE');

CREATE POLICY "Users can delete own comments"
  ON report_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_comments_report_id ON report_comments(report_id);
CREATE INDEX idx_comments_user_id ON report_comments(user_id);
CREATE INDEX idx_comments_parent_id ON report_comments(parent_id);
