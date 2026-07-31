-- Migration: Add UPDATE and DELETE RLS policies for report_flags
--
-- Without these, the flagReport Server Action's toggle logic (switch type
-- via UPDATE, unflag via DELETE) is silently rejected by RLS default-deny,
-- so only the initial INSERT ever works.

CREATE POLICY "Citizens can update own flags"
  ON report_flags FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Citizens can delete own flags"
  ON report_flags FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
