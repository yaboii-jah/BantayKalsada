# Public REST API for Approved Reports

## Design

- **Genre:** Utility/Integration — a public, read-only JSON API exposing approved road-hazard reports to third-party consumers (LGUs, DPWH, traffic apps, media, researchers).
- **Architecture:** Two thin `GET` route handlers (`/api/reports`, `/api/reports/[id]`) that Zod-validate query params, rate-limit by IP hash, delegate to a service layer, and return the codebase-standard `{ success, data }` envelope. Data access uses the per-request anon-key server client — the existing RLS policy *"Anyone can read approved and resolved reports"* gates every row. No service role for reads, no PII.
- **No schema change to `reports`.** Only a new `api_request_log` rate-limit table.
- **No UI, no proxy changes, no new dependencies.**

### Design Decisions

- **Anonymous access** — third parties get data without an account; RLS + a curated field whitelist is the access control.
- **DB-backed rate limiting** — a `api_request_log` table keyed by a SHA-256 hash of the client IP (plus pepper). Consistent with the `upload_sign_log` pattern, works on Vercel serverless, survives restarts. **Service-role client used for rate-limit bookkeeping** because the table has RLS enabled with zero policies (anon/authenticated cannot touch it via PostgREST — no hashed-IP or timestamp exposure). This is a documented deviation from "service role = admin only": rate limiting is server-internal bookkeeping with no user association, so a per-user RLS policy (the `deleteNotification` pattern) is not possible.
- **Edge caching** — `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` so Vercel's CDN absorbs repeated hits (Hobby-tier friendly). `Access-Control-Allow-Origin: *` for browser consumers. `OPTIONS` preflight auto-handled by Next.js.
- **Validation before rate limiting** — invalid requests get a cheap `400` without consuming rate-limit quota or writing to the log table.
- **Search hardening** — the `q` search term is sanitized (`% _ . , ( )` stripped) so PostgREST filter syntax cannot be broken by arbitrary input. This is a deliberate hardening deviation from the browse page (which passes raw input).
- **Future extension points** — the contract stays additive for the multi-municipality roadmap: `?municipality=` param and `municipality` response field later; `GET /api/municipalities` is a follow-up. Nothing multi-tenant is built now.

## Endpoint 1 — `GET /api/reports`

### Query Parameters (all optional; validated with Zod)

| Param | Valid values | Default |
|-------|--------------|---------|
| `category` | `POTHOLE`, `FLOODED_ROAD`, `ROAD_ACCIDENT`, `ROAD_RAGE`, `OTHER` | all |
| `severity` | `MINOR`, `URGENT`, `EMERGENCY` | all |
| `status` | `APPROVED`, `RESOLVED` | both |
| `barangay` | `DOLORES`, `SAN_ISIDRO`, `SAN_JUAN`, `SANTA_ANA`, `MUZON` | all |
| `q` | free text (max 100 chars; ILIKE on title + description) | — |
| `page` | int ≥ 1 | `1` |
| `page_size` | int 1–100 | `20` |

Invalid values → `400` JSON. Results ordered by `submitted_at` desc. Non-string numeric params are coerced via `z.coerce`; empty-string params are treated as absent.

### Response (200)

```json
{
  "success": true,
  "data": {
    "reports": [ { /* see PublicReport */ } ],
    "pagination": { "page": 1, "page_size": 20, "total": 47, "total_pages": 3 }
  }
}
```

### PublicReport shape (field whitelist)

`id`, `title`, `description`, `category`, `severity`, `barangay`, `status`, `latitude`, `longitude`, `location_label`, `photo_urls` (rewritten via `getDisplayUrl()` → `res-3.cloudinary.com`), `resolution_notes`, `submitted_at`, `resolved_at`.

**Never exposed:** `rejection_reason` (invariant #7 — private to submitter), `submitted_by_id`, `reviewed_by_id`, `reviewed_at`, PostGIS `location`. A runtime guard in `serializePublicReport` throws if a non-public-status row is ever passed to the serializer.

## Endpoint 2 — `GET /api/reports/[id]`

- Path param: valid UUID (else `400`).
- Returns a single `PublicReport` → `200` `{ success, data }`.
- Not found / not publicly visible (PENDING/REJECTED) → `404` `{ success: false, error: "Report not found" }`.
- In Next 16 the dynamic `params` is a Promise — the handler `await`s it.

## Auth & Rate Limiting

- **Auth:** none. Anonymous via anon-key server client; RLS + `.in("status", ["APPROVED","RESOLVED"])` defense-in-depth.
- **Rate limiting (`api_request_log`):**
  - Table: `id uuid PK default gen_random_uuid()`, `ip_hash text not null`, `created_at timestamptz default now()`; index `(ip_hash, created_at)`. RLS enabled, zero policies.
  - `ip_hash = sha256(ip + (API_RATE_LIMIT_SECRET ?? default_pepper))`.
  - Limits: **120 req/hour + 1,000/day** per IP hash (sliding window, counted via exact count, verified before insert).
  - Over limit → `429` `{ success: false, error: "Rate limit exceeded. Please try again later." }` + `Retry-After` header (computed from the oldest in-window row).
  - Housekeeping: on each request, a 1% chance prune of rows older than 7 days — keeps the table bounded. **No cron** (not available on Vercel Hobby).

## Headers

- `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` (200 responses only)
- `Access-Control-Allow-Origin: *` (all responses)
- `Retry-After` on `429`
- `OPTIONS` preflight: auto-handled by Next.js.

## States

| State | Behavior |
|-------|----------|
| **Default** | `200` with reports + pagination |
| **Invalid param** | `400` JSON (Zod error) |
| **Not found** | `404` JSON (single endpoint) |
| **Rate limited** | `429` JSON + `Retry-After` |
| **DB failure** | `500` JSON `{ success: false, error: "Failed to fetch reports" }` |
| **Cached** | Served from Vercel edge for up to 60s, stale-while-revalidate 300s |

## Edge Cases

- **Empty dataset / filter match** — `200` with `reports: []`, `total: 0`, `total_pages: 0`.
- **`page` beyond range** — `200` with `reports: []`, correct pagination numbers.
- **Malformed `page`/`page_size`** (non-numeric, zero, negative, >100) — `400` via `z.coerce` + range checks.
- **Unknown enum value** (`category=BOGUS`) — `400`.
- **Photo URLs always display-ready** — regional CDN rewrite applied server-side.
- **`q` with PostgREST-syntax characters** (`% _ . , ( )`) — stripped before building the ILIKE filter.
- **Hash-only IP storage** — raw client IPs are never written to the database.

## Data Flow

```
Consumer → GET /api/reports?category=POTHOLE&page=2
  → handler:
    1. Build raw param object from searchParams (empty strings dropped)
    2. Zod-validate (listReportsQuerySchema) → 400 on failure (no rate-limit cost)
    3. ip_hash = sha256(clientIP + pepper); enforceApiRateLimit()
       → prune stale rows (1% chance) + count hourly/daily windows + insert; 429 on limit
    4. createSupabaseServerClient() (anon) → fetchPublicReports()
       → RLS-scoped query + .in("status", ["APPROVED","RESOLVED"]) + filters
         + sanitized ILIKE + .range() + exact count (single round trip)
    5. serializePublicReport() each row (whitelist + getDisplayUrl + status guard)
    6. return { success, data: { reports, pagination } } + cache/CORS headers
```

## Files Created

| File | Purpose |
|------|---------|
| `app/api/reports/route.ts` | `GET` list handler (validate → rate limit → service → respond) |
| `app/api/reports/[id]/route.ts` | `GET` single handler (`await params`) |
| `lib/api-reports.ts` | `serializePublicReport`, `fetchPublicReports`, `fetchPublicReportById` |
| `lib/api-rate-limit.ts` | `hashIp`, `clientIp`, `enforceApiRateLimit`, limits/constants |
| `lib/validations/api.ts` | `listReportsQuerySchema`, `reportParamsSchema`, `publicReportSchema`, response types |
| `supabase/migrations/20250801000001_create_api_request_log.sql` | `api_request_log` table + index (RLS, no policies) |

## Files Modified

| File | Change |
|------|--------|
| `types/database.types.ts` | Regenerated via `supabase gen types typescript --linked` (adds `api_request_log`) |
| `context/project-overview.md` | Public REST API → In Scope |
| `context/architecture.md` | `app/api/reports` boundary + `api_request_log` in storage model |
| `context/progress-tracker.md` | Mark complete |

## Implementation Status

| Item | Status |
|------|--------|
| Migration `20250801000001_create_api_request_log.sql` created | ✅ |
| Migration applied to linked remote (`supabase db query --linked`); table + index + RLS verified | ✅ |
| `types/database.types.ts` regenerated | ✅ |
| `lib/validations/api.ts` — Zod schemas + response types | ✅ |
| `lib/api-rate-limit.ts` — IP hash, client IP, sliding-window limiter, prune | ✅ |
| `lib/api-reports.ts` — serialization + list + single queries | ✅ |
| `app/api/reports/route.ts` — list handler | ✅ |
| `app/api/reports/[id]/route.ts` — single handler | ✅ |
| Feature spec written | ✅ |
| Context files updated (project-overview, architecture, progress-tracker) | ✅ |
| `npm run build` passes with zero errors | ✅ |
| Smoke tests (list, filters, pagination, search, 400s, 404, 429 + Retry-After, CORS/cache headers, hashed storage) | ✅ |

## Check When Done

- [x] `GET /api/reports` returns filtered, paginated public reports
- [x] Every filter param validates; invalid → `400`
- [x] `GET /api/reports/[id]` returns single report; `404` for hidden/unknown
- [x] `rejection_reason`, user IDs, `reviewed_at`, `location` never appear in any response
- [x] Photo URLs rewritten to `res-3.cloudinary.com`
- [x] Rate limit: 120/hr + 1,000/day per IP hash → `429` + `Retry-After`
- [x] `api_request_log` stores only SHA-256 hashes, not raw IPs
- [x] `Cache-Control` + `Access-Control-Allow-Origin: *` present
- [x] RLS + `.in("status")` double-gate confirmed (no PENDING/REJECTED leak)
- [x] Migration applied via `supabase db query --linked`; types regenerated
- [x] `npm run build` passes with zero errors
