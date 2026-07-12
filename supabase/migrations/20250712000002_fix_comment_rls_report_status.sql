-- Migration: Fix INSERT RLS on report_comments to verify report is APPROVED/RESOLVED

DROP POLICY IF EXISTS "Authenticated users can insert comments" ON report_comments;

CREATE POLICY "Authenticated users can insert comments"
  ON report_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM reports
      WHERE reports.id = report_id
      AND reports.status IN ('APPROVED', 'RESOLVED')
    )
  );
