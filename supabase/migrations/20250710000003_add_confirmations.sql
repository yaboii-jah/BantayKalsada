CREATE TABLE confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(report_id, user_id)
);

ALTER TABLE confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Confirmations are viewable by everyone"
  ON confirmations FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert their own confirmations"
  ON confirmations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own confirmations"
  ON confirmations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_confirmations_report_id ON confirmations(report_id);
CREATE INDEX idx_confirmations_user_id ON confirmations(user_id);
