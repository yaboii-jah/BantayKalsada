-- Migration: Add reports.duplicate_of_id for duplicate-report linking/merge
--
-- Points a report at its canonical (survivor) report when it has been linked
-- as a duplicate or merged into another report. The duplicate report is NEVER
-- hard-deleted — it is retired by setting this pointer, preserving audit
-- history and notification foreign keys.

ALTER TABLE reports ADD COLUMN duplicate_of_id uuid NULL
  REFERENCES reports(id) ON DELETE SET NULL;

CREATE INDEX idx_reports_duplicate_of ON reports(duplicate_of_id);
