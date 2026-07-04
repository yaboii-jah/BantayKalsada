# My Reports Page Implementation

## Design (Hallmark-informed)

- **Genre:** Utilitarian — civic safety tool. Mobile-first: the primary user is a citizen checking their report status from their phone.
- **List structure:** Card grid matching the browse feed layout, filtered to show only the authenticated user's reports across all statuses (PENDING, APPROVED, REJECTED, RESOLVED).
- **Filter:** Status pill tabs (All / Pending / Approved / Rejected / Resolved) driven by URL search params (`?status=PENDING`). Server-side filter via `.eq("status", selected)` on the Supabase query. "All" shows every status.
- **Colors:** All existing `--color-*` and `--status-*` tokens preserved. No new tokens. No hardcoded hex values.
- **Type:** Inherited project tokens — Inter UI, JetBrains Mono for technical data.

### List Layout
- Responsive card grid: 1 col mobile, 2 sm, 3 lg, 4 xl, 5 2xl (same as `/browse`)
- Status filter tabs row below the heading
- Pagination with `PaginationBar` (12 per page)
- Filter bar always visible (even in empty state) so user can change/clear the filter
- Empty state logic: `isNewUser` (no reports + no filter) shows "No reports yet" + "Submit a report" CTA; `isFiltered` (filter active, zero results) shows "No reports for this status" + "Clear all filters" button

### Detail Layout
- Single centered column, `max-w-3xl` (same as public detail page)
- Photo gallery carousel (reuses `PhotoGallery`)
- Rejection reason shown as an Alert banner when `status === "REJECTED"` — amber background with XCircle icon and the admin's rejection reason
- Interactive map (reuses `ReportMapWrapper`)
- Back link to `/my-reports`

### ReportCard href
- `ReportCard` gains an optional `href` prop that overrides the default `/reports/${id}` link
- On `/my-reports`, cards link to `/my-reports/${report.id}`
- On `/browse`, cards continue linking to `/reports/${report.id}` (backward compatible)

### Post-submit Redirect
- After successful report submission, redirect to `/my-reports` instead of `/browse`
- User sees their newly submitted PENDING report immediately in their history

### Auth Gates (proxy.ts)
- Already configured: `/my-reports` is listed in `protectedRoutes`
- Unauthenticated → `/login?redirect=/my-reports`
- No email-verification gate on `/my-reports` itself (only `/submit` gates that)

### States

**List page:**
- **Loading:** Skeleton card grid in `loading.tsx` (6 card skeletons)
- **Empty (new user, no filter):** `FileText` icon + "No reports yet" + "You haven't submitted any road hazard reports yet…" + "Submit a report" button
- **Empty (filtered, zero results):** `FileText` icon + "No reports for this status" + "Try selecting a different status filter…" + "Clear all filters" button
- **Error:** Error boundary with retry button in `error.tsx`

**Detail page:**
- **Loading:** Skeleton layout (heading, gallery, text blocks, map) in `loading.tsx`
- **Not found:** Custom 404 with "Report not found" + back to `/my-reports`
- **Rejected state:** Amber Alert banner with rejection reason, between metadata and description
- **Error:** Error boundary with retry button in `error.tsx`

## Components

### New
- `app/(citizen)/my-reports/page.tsx` — Server Component: list own reports with filter tabs, card grid, pagination
- `app/(citizen)/my-reports/loading.tsx` — skeleton card grid (6 skeleton cards)
- `app/(citizen)/my-reports/error.tsx` — error boundary with retry
- `app/(citizen)/my-reports/[id]/page.tsx` — Server Component: own report detail with rejection alert
- `app/(citizen)/my-reports/[id]/loading.tsx` — detail page skeleton
- `app/(citizen)/my-reports/[id]/error.tsx` — detail page error boundary
- `app/(citizen)/my-reports/[id]/not-found.tsx` — custom 404 with back link
- `components/reports/my-reports-filter.tsx` — status pill tabs (All/Pending/Approved/Rejected/Resolved)

### Modified
- `components/reports/report-card.tsx` — add optional `href` prop
- `components/reports/report-form.tsx` — change redirect from `/browse` to `/my-reports`
- `context/progress-tracker.md` — update with completed phase

## Implementation

1. Add optional `href` prop to `ReportCard` (defaults to `/reports/${id}`)
2. Create `components/reports/my-reports-filter.tsx` — status pill tabs component
3. Create `app/(citizen)/my-reports/page.tsx` — list page with Supabase query, filter, pagination
4. Create `app/(citizen)/my-reports/loading.tsx` — 6-card skeleton grid
5. Create `app/(citizen)/my-reports/error.tsx` — error boundary
6. Create `app/(citizen)/my-reports/[id]/page.tsx` — detail page with rejection alert banner
7. Create `app/(citizen)/my-reports/[id]/loading.tsx` — detail skeleton
8. Create `app/(citizen)/my-reports/[id]/error.tsx` — error boundary
9. Create `app/(citizen)/my-reports/[id]/not-found.tsx` — custom 404
10. Change redirect in `report-form.tsx` from `/browse` to `/my-reports`
11. Update `context/progress-tracker.md`

## Implementation Status

| Item | Status |
|---|---|---|
| `ReportCard` optional `href` prop | ✅ Built |
| `MyReportsFilter` status pill tabs | ✅ Built |
| `/my-reports` list page with card grid | ✅ Built |
| Status filter driven by URL params | ✅ Built |
| Pagination (12 per page) | ✅ Built |
| Empty state with CTA for new users | ✅ Built |
| Empty state with clear filter for filtered views | ✅ Built |
| Filter bar always visible, even in empty state | ✅ Built |
| Loading skeleton (list) | ✅ Built |
| Error boundary (list) | ✅ Built |
| `/my-reports/[id]` detail page | ✅ Built |
| Rejection reason Alert banner | ✅ Built |
| Photo gallery, map, metadata | ✅ Built |
| Loading skeleton (detail) | ✅ Built |
| Error boundary (detail) | ✅ Built |
| Not found (detail) | ✅ Built |
| Post-submit redirect to `/my-reports` | ✅ Built |
| `npm run build` passes | ✅ Built |
| Progress tracker updated | ✅ Built |

## Check When Done

- [x] `/my-reports` shows only the authenticated user's reports
- [x] All statuses appear by default (PENDING, APPROVED, REJECTED, RESOLVED)
- [x] Status pill tabs filter correctly via URL params
- [x] Card grid matches browse layout
- [x] Filter bar always visible (even in empty state)
- [x] Empty state shows CTA for new users (no filter, no reports)
- [x] Empty state shows "No reports for this status" + clear filter when filtered
- [x] Detail page shows rejection reason as Alert banner when REJECTED
- [x] Back link on detail page goes to `/my-reports`
- [x] Post-submit redirect goes to `/my-reports`
- [x] Loading skeletons render correctly
- [x] Error boundaries catch crashes
- [x] `npm run build` passes with zero errors
- [x] No hardcoded hex values — all tokens used
- [x] Mobile responsive — card grid collapses to 1 column
