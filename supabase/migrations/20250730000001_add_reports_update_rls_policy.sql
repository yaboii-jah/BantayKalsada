-- Migration: Add UPDATE RLS policy for citizens editing their own pending reports
--
-- Without this policy, supabase-js UPDATE calls are silently rejected by
-- RLS default-deny, preventing citizens from editing their pending reports.

CREATE POLICY "Citizens can update their own pending reports"
  ON reports FOR UPDATE
  TO authenticated
  USING (auth.uid() = submitted_by_id AND status = 'PENDING')
  WITH CHECK (auth.uid() = submitted_by_id);
