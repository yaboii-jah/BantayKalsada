-- Migration: Add the two remaining documented reports indexes
--
-- data-model.md has always documented idx_reports_submitted_by_id and
-- idx_reports_submitted_at, but no migration ever created them (only
-- idx_reports_location and idx_reports_duplicate_of existed on reports).
-- Migration 20260820000001 materialized the status/category/barangay/title
-- indexes; this migration completes the documented set.
-- All statements are idempotent.

CREATE INDEX IF NOT EXISTS idx_reports_submitted_by_id ON reports(submitted_by_id);

CREATE INDEX IF NOT EXISTS idx_reports_submitted_at ON reports(submitted_at DESC);