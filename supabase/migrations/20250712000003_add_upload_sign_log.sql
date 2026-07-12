-- Migration: Create upload_sign_log table for rate limiting the /api/uploads/sign endpoint

CREATE TABLE upload_sign_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE upload_sign_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own sign log"
  ON upload_sign_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own sign log"
  ON upload_sign_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_upload_sign_log_user_created ON upload_sign_log(user_id, created_at);  
