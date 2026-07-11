-- Migration: Add author_name to report_comments for simpler display queries

ALTER TABLE report_comments ADD COLUMN author_name text NOT NULL DEFAULT '';

-- Backfill author_name from profiles for existing comments
UPDATE report_comments rc
SET author_name = COALESCE(p.full_name, '')
FROM profiles p
WHERE rc.user_id = p.id;
