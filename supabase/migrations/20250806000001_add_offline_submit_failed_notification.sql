-- Migration: Add OFFLINE_SUBMIT_FAILED to notification_type enum
-- and an offline_queue_id column to correlate offline draft notifications
-- with the local IndexedDB queue (no FK — the queue lives only on the device).
--
-- Run this migration WITHOUT a transaction wrapper:
--   supabase migration up --no-transaction
-- or execute manually via Supabase Dashboard SQL editor.
--
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block in PostgreSQL.
-- This file MUST be applied outside a transaction.

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'OFFLINE_SUBMIT_FAILED';

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS offline_queue_id text;
