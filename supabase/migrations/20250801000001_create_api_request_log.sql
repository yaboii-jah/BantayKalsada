-- Migration: Create api_request_log table for rate limiting the public REST API
--
-- The table is written and read ONLY by server-side rate-limit logic
-- (lib/api-rate-limit.ts) using the service-role client. RLS is enabled with
-- no policies so the anon/authenticated roles cannot read or mutate rate-limit
-- rows via the PostgREST endpoint; the service role bypasses RLS. Only the
-- SHA-256 hash of the client IP (plus pepper) is stored — never the raw IP.

CREATE TABLE api_request_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash     text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE api_request_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_api_request_log_ip_created ON api_request_log(ip_hash, created_at);
