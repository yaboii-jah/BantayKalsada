# CSV Export for Admin Reports

## Design

- **Genre:** Utility — server-generated CSV download for admin moderation queues.
- **Architecture:** A single `GET` API route (`/api/admin/export`) that authenticates the admin, fetches all matching reports via service role client, joins submitter profile data, serializes to CSV with proper escaping, and returns the file as a download attachment. Each queue page links to the route with the appropriate `?status=` param.
- **No DB changes, no new Server Actions, no client-side logic** — pure server-side file generation using a GET request.

### Entry Points

| Entry | Route | Purpose |
|-------|-------|---------|
| Dashboard | `/admin` | "Export All CSV" button — exports all reports regardless of status |
| Pending queue | `/admin/pending` | "Export CSV" button — exports PENDING reports only |
| Approved queue | `/admin/approved` | "Export CSV" button — exports APPROVED reports only |
| Rejected queue | `/admin/rejected` | "Export CSV" button — exports REJECTED reports only |
| Resolved queue | `/admin/resolved` | "Export CSV" button — exports RESOLVED reports only |

## API Route — `GET /api/admin/export`

### Query Parameters

| Param | Required | Default | Values |
|-------|----------|---------|--------|
| `status` | No | (all) | `PENDING`, `APPROVED`, `REJECTED`, `RESOLVED` |

Invalid status values return a `400` JSON error.

### Auth Flow

1. `createSupabaseServerClient()` → `supabase.auth.getUser()` — returns `401` JSON if unauthenticated
2. Query `profiles.role` for the authenticated user — returns `403` JSON if not `ADMIN`

### Data Fetch

Uses `createAdminClient()` (service role) to fetch all matching reports with:
```
id, status, category, severity, barangay, title, description, photo_urls,
latitude, longitude, location_label, submitted_by_id, reviewed_by_id,
submitted_at, reviewed_at, resolved_at, rejection_reason,
resolution_notes, resolved_image_urls
```
Then fetches profiles for all unique `submitted_by_id` values to map `full_name` and `email`.

### CSV Format

- BOM-prefixed UTF-8 (`\uFEFF`) for Excel compatibility
- Fields containing commas, double quotes, or newlines are double-quote-escaped
- Double quotes inside values are escaped as `""`

| Column | Source | Notes |
|--------|--------|-------|
| ID | `reports.id` | UUID |
| Status | `reports.status` | PENDING / APPROVED / REJECTED / RESOLVED |
| Category | `reports.category` | Raw enum value |
| Severity | `reports.severity` | MINOR / URGENT / EMERGENCY |
| Barangay | `reports.barangay` | Empty string if null |
| Title | `reports.title` | |
| Description | `reports.description` | |
| Submitted At | `reports.submitted_at` | ISO timestamp |
| Reviewed At | `reports.reviewed_at` | Empty string if null |
| Resolved At | `reports.resolved_at` | Empty string if null |
| Submitter Name | `profiles.full_name` | |
| Submitter Email | `profiles.email` | |
| Latitude | `reports.latitude` | |
| Longitude | `reports.longitude` | |
| Location Label | `reports.location_label` | Empty string if null |
| Rejection Reason | `reports.rejection_reason` | Empty string if null |
| Resolution Notes | `reports.resolution_notes` | Empty string if null |
| Photo URLs | `reports.photo_urls` | Semicolon-separated list |
| Resolution Image URLs | `reports.resolved_image_urls` | Semicolon-separated list |

### Response

- Success: `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="bantay-kalsada-reports-{status}-{date}.csv"`, status `200`
- Error (auth): `{ success: false, error: "Not authenticated" }`, status `401`
- Error (role): `{ success: false, error: "Forbidden" }`, status `403`
- Error (invalid status): `{ success: false, error: "Invalid status. Must be one of: PENDING, APPROVED, REJECTED, RESOLVED" }`, status `400`
- Error (fetch): `{ success: false, error: "Failed to fetch reports" }`, status `500`
- Error (catch-all): `{ success: false, error: "Failed to export reports" }`, status `500`

## States

| State | Behavior |
|-------|----------|
| **Default** | Export CSV / Export All CSV button visible when reports exist (totalCount > 0) |
| **Empty** | Button hidden — no data to export |
| **Loading** | Browser native download spinner appears after click (GET request to API route) |
| **Error (auth)** | Returns 401 JSON — user must re-login |
| **Error (forbidden)** | Returns 403 JSON — non-admin users cannot access |
| **Error (invalid param)** | Returns 400 JSON |
| **Error (server)** | Returns 500 JSON — fetch or generation failure |
| **Success** | Browser downloads the `.csv` file automatically |

## Edge Cases

- **No reports match the status filter** — the button is hidden when `totalCount` is 0; if somehow called with no data, an empty CSV (headers only) is returned
- **Special characters in text fields** — commas, quotes, and newlines are properly escaped per CSV spec
- **Excel compatibility** — BOM prefix ensures UTF-8 characters (Filipino text, emoji in descriptions) display correctly in Excel
- **Large datasets** — no pagination on export; all matching reports are returned in a single file (admin datasets are expected to fit within Next.js response limits)
- **Missing profile** — `submitted_by_id` may reference a deleted user; `profileMap.get()` returns `"Unknown"` / `""` gracefully

## Data Flow

```
Admin clicks "Export CSV" on queue page:
  → Browser navigates to GET /api/admin/export?status=PENDING (or no param for all)
  → Route handler:
    1. supabase.auth.getUser() — auth check
    2. profiles.role === "ADMIN" — role check
    3. Validate optional ?status= param
    4. createAdminClient().from("reports").select(...).eq("status", status?) — fetch all matching reports
    5. createAdminClient().from("profiles").select(...).in("id", submitterIds) — fetch submitter info
    6. Build CSV string via lib/csv.ts toCsv(headers, rows)
    7. Return new NextResponse(csv, { headers: { Content-Type, Content-Disposition } })
  → Browser downloads bantay-kalsada-reports-PENDING-2026-07-27.csv
```

## Files Created

| File | Purpose |
|------|---------|
| `lib/csv.ts` | CSV generation utility — `toCsv(headers, rows)` with BOM prefix and field escaping |
| `app/api/admin/export/route.ts` | GET handler — auth → admin check → fetch → CSV → download |

## Files Modified

| File | Change |
|------|--------|
| `app/admin/page.tsx` | Added "Export All CSV" `<a>` link beside dashboard heading, conditionally rendered when reports exist |
| `app/admin/pending/page.tsx` | Added "Export CSV" `<a>` link beside page heading, links to `/api/admin/export?status=PENDING` |
| `app/admin/approved/page.tsx` | Same, links to `?status=APPROVED` |
| `app/admin/rejected/page.tsx` | Same, links to `?status=REJECTED` |
| `app/admin/resolved/page.tsx` | Same, links to `?status=RESOLVED` |
| `context/progress-tracker.md` | Marked CSV export as completed in Quick Wins (v2.0) |

## Implementation Status

| Item | Status |
|------|--------|
| `lib/csv.ts` — CSV generation utility | ✅ Done |
| `app/api/admin/export/route.ts` — export API route | ✅ Done |
| `app/admin/page.tsx` — Export All CSV button | ✅ Done |
| `app/admin/pending/page.tsx` — Export CSV button | ✅ Done |
| `app/admin/approved/page.tsx` — Export CSV button | ✅ Done |
| `app/admin/rejected/page.tsx` — Export CSV button | ✅ Done |
| `app/admin/resolved/page.tsx` — Export CSV button | ✅ Done |
| Progress tracker updated | ✅ Done |

## Check When Done

- [x] Dashboard "Export All CSV" downloads all reports regardless of status
- [x] Pending queue "Export CSV" downloads only PENDING reports
- [x] Approved queue "Export CSV" downloads only APPROVED reports
- [x] Rejected queue "Export CSV" downloads only REJECTED reports
- [x] Resolved queue "Export CSV" downloads only RESOLVED reports
- [x] CSV includes all 19 columns with correct data
- [x] CSV opens correctly in Excel (BOM prefix, UTF-8 encoding)
- [x] Fields with commas/quotes/newlines are properly escaped
- [x] Unauthenticated users get 401
- [x] Non-admin authenticated users get 403
- [x] Invalid `?status=` value returns 400
- [x] Button hidden when no reports exist for that status
- [x] Empty dataset returns CSV with headers only (no crash)
- [x] `npm run build` passes with zero errors
