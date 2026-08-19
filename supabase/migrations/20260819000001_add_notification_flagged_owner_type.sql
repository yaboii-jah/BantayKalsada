-- Migration: Add REPORT_FLAGGED_OWNER to notification_type enum
--
-- In-app only (no email/SMS) notification sent to a report's submitter when
-- a citizen flags their report. MUST be applied outside a transaction
-- (ALTER TYPE ... ADD VALUE cannot run inside one).

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'REPORT_FLAGGED_OWNER';