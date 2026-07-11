-- Migration: Fix reports RLS policy to cover authenticated users too
-- The EXISTS subquery in report_comments RLS needs authenticated non-owners
-- to be able to read approved/resolved reports. The old TO anon-only policy
-- blocked the subquery for authenticated users viewing someone else's report.

DROP POLICY IF EXISTS "Public can read approved and resolved reports" ON reports;

CREATE POLICY "Anyone can read approved and resolved reports"
  ON reports FOR SELECT
  USING (status IN ('APPROVED', 'RESOLVED'));
