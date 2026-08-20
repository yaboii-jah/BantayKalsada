-- Migration: Admin performance — aggregate RPCs + query indexes
--
-- Replaces the dashboard's "fetch entire reports table" pattern with DB-side
-- aggregates, gives the admin queues indexed filter columns, and computes the
-- sidebar flags badge with a distinct-count instead of streaming every flag row.
-- All statements are idempotent.

-- ---------------------------------------------------------------------------
-- Aggregate RPCs (dashboard)
-- ---------------------------------------------------------------------------

-- Count of reports grouped by status.
CREATE OR REPLACE FUNCTION count_reports_by_status()
RETURNS TABLE(status report_status, count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT status, count(*)::bigint AS count
  FROM reports
  GROUP BY status;
$$;

-- Daily submission counts for the given window (date_trunc 'day').
CREATE OR REPLACE FUNCTION daily_submissions_since(since timestamptz)
RETURNS TABLE(day date, count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT date_trunc('day', submitted_at)::date AS day, count(*)::bigint AS count
  FROM reports
  WHERE submitted_at >= since
  GROUP BY 1
  ORDER BY 1;
$$;

-- Count of reports grouped by category.
CREATE OR REPLACE FUNCTION count_reports_by_category()
RETURNS TABLE(category report_category, count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT category, count(*)::bigint AS count
  FROM reports
  GROUP BY category
  ORDER BY count DESC;
$$;

-- Count of reports grouped by barangay.
CREATE OR REPLACE FUNCTION count_reports_by_barangay()
RETURNS TABLE(barangay public.barangay, count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT r.barangay, count(*)::bigint AS count
  FROM reports r
  GROUP BY r.barangay
  ORDER BY count DESC;
$$;

-- Average time from submission to resolution, in hours (NULL when none).
CREATE OR REPLACE FUNCTION avg_resolution_hours()
RETURNS double precision
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - submitted_at)) / 3600.0)::double precision
  FROM reports
  WHERE status = 'RESOLVED' AND resolved_at IS NOT NULL;
$$;

-- Count of reports submitted within the given window.
CREATE OR REPLACE FUNCTION count_reports_since(since timestamptz)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT count(*)::bigint
  FROM reports
  WHERE submitted_at >= since;
$$;

-- Count of distinctly flagged reports (sidebar badge).
CREATE OR REPLACE FUNCTION count_distinct_flagged_reports()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT count(DISTINCT report_id)::bigint
  FROM report_flags;
$$;

-- ---------------------------------------------------------------------------
-- Indexes (queue filters + title search)
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS reports_status_idx ON reports (status);
CREATE INDEX IF NOT EXISTS reports_status_submitted_at_idx ON reports (status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS reports_category_idx ON reports (category);
CREATE INDEX IF NOT EXISTS reports_barangay_idx ON reports (barangay);

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS reports_title_trgm_idx ON reports USING gin (title gin_trgm_ops);