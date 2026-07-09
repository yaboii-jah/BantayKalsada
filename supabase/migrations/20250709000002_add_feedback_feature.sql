-- Migration 2/2: Create feedback feature tables, types, RLS, and indexes
-- Run this AFTER 20250709000001 has been applied (the notification_type enum
-- must already have FEEDBACK_ACKNOWLEDGED and FEEDBACK_CLOSED values).

-- 1. Create enum types for feedback
CREATE TYPE feedback_type AS ENUM ('BUG_REPORT', 'FEATURE_REQUEST', 'GENERAL');
CREATE TYPE feedback_status AS ENUM ('OPEN', 'ACKNOWLEDGED', 'CLOSED');

-- 2. Create feedback table
CREATE TABLE feedback (
  id              uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid              NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            feedback_type     NOT NULL,
  title           text              NOT NULL,
  description     text              NOT NULL,
  rating          smallint          NULL,
  status          feedback_status   NOT NULL DEFAULT 'OPEN',
  admin_note      text              NULL,
  created_at      timestamptz       NOT NULL DEFAULT now(),
  updated_at      timestamptz       NOT NULL DEFAULT now(),

  CONSTRAINT feedback_rating_range CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  CONSTRAINT feedback_title_length CHECK (char_length(title) >= 10 AND char_length(title) <= 100),
  CONSTRAINT feedback_description_length CHECK (char_length(description) >= 20 AND char_length(description) <= 2000)
);

-- 3. Alter notifications table to support feedback references
ALTER TABLE notifications ALTER COLUMN report_id DROP NOT NULL;
ALTER TABLE notifications ADD COLUMN feedback_id uuid NULL REFERENCES feedback(id) ON DELETE CASCADE;

-- 4. Indexes
CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);

-- 5. Row Level Security
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Citizens can read their own feedback
CREATE POLICY "Citizens can read own feedback"
  ON feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Authenticated users can insert feedback
CREATE POLICY "Authenticated users can insert feedback"
  ON feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 6. Trigger for updated_at (reuses existing public.set_updated_at function)
CREATE TRIGGER set_feedback_updated_at
  BEFORE UPDATE ON feedback
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();
