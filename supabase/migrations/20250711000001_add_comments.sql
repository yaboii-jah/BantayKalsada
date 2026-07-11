-- Migration: Add comments on reports
-- Run this migration WITHOUT a transaction wrapper:
--   supabase migration up --no-transaction
-- or execute manually via Supabase Dashboard SQL editor.
--
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block in PostgreSQL.
-- This file MUST be applied outside a transaction.

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'COMMENT_ADDED';
