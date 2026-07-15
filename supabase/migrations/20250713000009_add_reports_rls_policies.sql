-- Migration: Add RLS policies for reports table
--
-- RLS was documented in data-model.md but never explicitly enabled
-- via migration, and the INSERT policy was never created. Without it,
-- citizen report submissions fail with default-deny when RLS is enabled.

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for a clean slate
DROP POLICY IF EXISTS "Anyone can read approved and resolved reports" ON reports;
DROP POLICY IF EXISTS "Citizens can read own reports" ON reports;
DROP POLICY IF EXISTS "Authenticated users can insert reports" ON reports;

-- Public (anon + authenticated): read approved/resolved reports
CREATE POLICY "Anyone can read approved and resolved reports"
  ON reports FOR SELECT
  USING (status IN ('APPROVED', 'RESOLVED'));

-- Authenticated: read own reports regardless of status
CREATE POLICY "Citizens can read own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (auth.uid() = submitted_by_id);

-- Authenticated: insert reports (must set own ID)
CREATE POLICY "Authenticated users can insert reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = submitted_by_id);
