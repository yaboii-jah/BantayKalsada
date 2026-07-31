-- Migration: Allow a citizen to flag a report with both types simultaneously
--
-- Changes the unique guarantee from "one flag per citizen per report" to
-- "one flag per citizen per report per type", so "Already fixed" and
-- "Wrong location" are independent toggles of their own rows instead of
-- mutually exclusive alternatives.

ALTER TABLE report_flags
  DROP CONSTRAINT report_flags_unique_per_user;

ALTER TABLE report_flags
  ADD CONSTRAINT report_flags_unique_per_type UNIQUE (report_id, user_id, flag_type);
