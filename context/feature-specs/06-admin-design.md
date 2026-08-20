# Admin Panel Implementation

## Design (Hallmark-informed)

- **Genre:** Utilitarian — desk-bound moderation tool for LGU/municipal staff. Desktop-first: admins are expected to work from a laptop or desktop.
- **Macrostructure:** Workbench — persistent sidebar navigation (w-64) + scrollable content canvas. No hero, no CTA, no marketing copy.
- **Colors:** All existing `--color-*`, `--sidebar-*`, and `--status-*` tokens preserved. No new tokens. No hardcoded hex values.
- **Type:** Inherited project tokens — Inter UI, JetBrains Mono for technical data (coordinates, report IDs).
- **Hallmark pre-emit critique:** P5 H5 E4 S5 R5 V3 — Variety intentionally lower: admin UIs should be consistent, not surprising.

### Layout

- Two-column split: fixed sidebar (`sticky top-0 h-screen`, w-64, white bg, `border-r border-border`) + main content area (fills remaining width, `bg-muted`, scrollable)
- Sidebar holds logo/wordmark, nav links, pending count badge, admin name + sign out
- Main content pages: Dashboard, Pending, Approved, Rejected, Resolved, Report Review
- All pages are Server Components — data fetching happens server-side

> **Updated (2026-08-20):** the sidebar is now a collapsible rail (persisted `localStorage["bk-admin-sidebar-hidden"]`, `PanelLeftClose`/`PanelLeftOpen`) and, below `lg`, renders as an **overlay drawer** that never pushes content (see `context/ui-context.md` → Admin Panel). The dashboard is dynamic (`export const dynamic = "force-dynamic"`) and its analytics use DB aggregate RPCs with lazy-loaded charts (`analytics-charts-lazy`). Admin main uses `bg-background bg-radial-glow` (not `bg-muted`) under the `body.admin-theme` dark palette.

### Sidebar Navigation

- Vertical list: Dashboard, Pending (with count badge), Approved, Rejected, Resolved
- Active link: `bg-primary/10` background, `text-primary` color, border-left accent (`border-l-2 border-l-primary`)
- Pending badge: inline amber pill `bg-status-pending/10 text-status-pending`, only visible when count > 0
- Icons (Lucide, h-5 w-5): LayoutDashboard, Clock, CheckCircle, XCircle, CheckCheck
- Bottom section: admin avatar initial + name + Sign Out button (client-side `supabase.auth.signOut()`)

### Dashboard (`/admin`)

- 4 status count cards in a responsive grid (4 cols desktop, 2 cols narrower)
- Each card: left 4px colored border matching status token, large count (`text-4xl font-bold`), label (`text-sm text-muted-foreground`)
- Colors: Pending = `--status-pending`, Approved = `--status-approved`, Rejected = `--status-rejected`, Resolved = `--status-resolved`
- Each card is a clickable link to its respective queue page
- Counts fetched via service role client (`COUNT(*)` grouped by status)

### Queue Pages (`/admin/pending`, `/admin/approved`, `/admin/rejected`, `/admin/resolved`)

- Header with status icon + title + total count (e.g., "Pending Reports (12)")
- Shadcn `Table` with columns: Status badge, Submitter name, Category label, Title (truncated), Date, Review link
- Rejected queue shows an extra "Rejection Reason" column
- Rows are clickable (cursor-pointer, hover highlight `bg-muted/50`) → navigate to `/admin/reports/[id]`
- Paginated with 20 items per page via URL search params (`?page=N`)
- Uses existing `PaginationBar` component
- Empty state: status icon (h-12 w-12, muted) + "No [status] reports" + contextual subtitle
- Pending queue sorted oldest-first (`submitted_at ASC`); all others newest-first (`submitted_at DESC`)

### Report Review Page (`/admin/reports/[id]`)

Single centered column, `max-w-4xl`. Sections in order:

1. **Header** — Category badge + status badge + relative date (right-aligned)
2. **Title** — `text-2xl font-bold`
3. **Photo gallery** — Reuses `PhotoGallery` (Shadcn Carousel)
4. **Description** — Full description inside a rounded card
5. **Map** — Reuses `ReportMapWrapper` (dynamic, ssr:false), 300px height, location label + coordinates below
6. **Submitter info** — Full name, email, submission date/time
7. **Reviewer history** — Reviewed by + date, resolved date (if applicable)
8. **Rejection reason** — Amber Alert banner (`bg-status-rejected/10 text-status-rejected`) with XCircle icon when `status === "REJECTED"`
9. **Action buttons** — Right-aligned, below a border-top separator

### Action Buttons

Conditional on current status:

| Status | Buttons Shown | Redirect After |
|--------|---------------|----------------|
| PENDING | Approve (primary) + Reject (destructive) | `/admin/pending` |
| APPROVED | Mark as Resolved (default) | `/admin/approved` |
| REJECTED | None | — |
| RESOLVED | None | — |

- Approve: CheckCircle icon, `bg-primary`, server action → update status to `APPROVED`, set `reviewed_by_id` + `reviewed_at`
- Resolve: CheckCheck icon, `bg-primary`, server action → update status to `RESOLVED`, set `resolved_at`
- Reject: XCircle icon, `bg-destructive`, opens rejection dialog → on confirm updates status to `REJECTED`, sets `rejection_reason` + `reviewed_by_id` + `reviewed_at`
- All buttons show loading spinner during mutation via `useTransition`
- Success → Sonner toast + redirect. Error → Sonner error toast (no redirect)

### Rejection Dialog

Shadcn `Dialog`, `sm:max-w-md`:

- Title: "Reject Report"
- Description: "You are about to reject this report. The submitter will receive this reason via email."
- Textarea with label "Reason for rejection", placeholder "Explain why this report was rejected...", maxLength 500
- Character count helper: shows "X more characters required" when < 10, "Minimum met" when >= 10, count/500 on right
- Confirm Rejection button (destructive variant) — disabled until reason >= 10 chars, shows spinner during submission
- Cancel button (outline variant) — closes dialog

### Auth Gates (proxy.ts + layout)

- proxy.ts: `/admin` is in `protectedRoutes` → unauthenticated → `/login?redirect=/admin`
- proxy.ts: after login on auth routes, checks `profiles.role` → admins redirect to `/admin`, citizens to `/browse`
- `app/admin/layout.tsx`: server-side role check — queries `profiles` for `role === "ADMIN"`, redirects non-admins to `/browse`
- `app/admin/actions.ts`: every Server Action independently re-verifies admin role via `profiles` query
- Service role client (`lib/supabase/service-role.ts`) used for all DB mutations and cross-user reads

### States

**Dashboard:**
- Loading: 4 skeleton card blocks (pulsing `bg-muted-foreground/10`)
- Empty: N/A — counts show 0 when no reports exist

**Queue pages:**
- Loading: 5 skeleton table rows (pulsing `bg-muted-foreground/10`)
- Empty (no reports): Status icon + "No [status] reports" + contextual subtitle
- Error: Error boundary with retry button

**Review page:**
- Loading: Skeleton layout — heading block, image block, text lines, map block
- Not found: `not-found.tsx` with "Report not found" + "Back to pending queue" button
- Rejected state: Amber Alert banner with rejection reason above action area
- Error: Error boundary with retry button

**Action buttons (8 states per Hallmark):**
- Default — button visible, enabled
- Hover — darker bg/destructive variant
- Focus-visible — ring outline
- Active — translateY(1px)
- Disabled — when another action is in progress
- Loading — spinner replaces icon
- Error — Sonner error toast callback
- Success — Sonner success toast → redirect

## Components

### New
- `lib/supabase/service-role.ts` — service role client factory (`createAdminClient()` using `SUPABASE_SERVICE_ROLE_KEY`)
- `app/admin/layout.tsx` — admin layout with sidebar + role guard + pending count
- `app/admin/actions.ts` — `approveReport`, `rejectReport`, `resolveReport` Server Actions
- `app/admin/page.tsx` — dashboard page
- `app/admin/loading.tsx` — skeleton loading state
- `app/admin/pending/page.tsx` — pending queue
- `app/admin/pending/loading.tsx` — skeleton table
- `app/admin/approved/page.tsx` — approved queue
- `app/admin/rejected/page.tsx` — rejected queue (with rejection reason column)
- `app/admin/resolved/page.tsx` — resolved queue
- `app/admin/reports/[id]/page.tsx` — report review page
- `app/admin/reports/[id]/admin-report-actions.tsx` — client wrapper for action buttons
- `app/admin/reports/[id]/loading.tsx` — review skeleton
- `app/admin/reports/[id]/error.tsx` — error boundary
- `app/admin/reports/[id]/not-found.tsx` — custom 404
- `components/admin/admin-sidebar.tsx` — sidebar navigation
- `components/admin/status-count-cards.tsx` — colored dashboard cards
- `components/admin/admin-queue-table.tsx` — reusable queue table
- `components/admin/action-buttons.tsx` — approve/reject/resolve with rejection dialog

### Modified
- `lib/validations/report.ts` — added `approveReportSchema`, `rejectReportSchema`, `resolveReportSchema` + inferred types
- `proxy.ts` — admin login redirect (admins → `/admin`, citizens → `/browse`)
- `context/progress-tracker.md` — updated with completed phase

### Reused (no changes)
- `ReportStatusBadge` — status badge in queue tables and review page
- `PhotoGallery` — photo carousel on review page
- `ReportMapWrapper` — interactive map on review page (dynamic, ssr:false)
- `PaginationBar` — table pagination on all queue pages
- All Shadcn/ui primitives — Table, Dialog, Button, Card, Alert

## Implementation

1. Create `lib/supabase/service-role.ts` — service role client factory
2. Create `app/admin/layout.tsx` — admin layout with sidebar + admin role guard + pending count fetch
3. Create `components/admin/admin-sidebar.tsx` — nav sidebar with active state + pending badge + sign out
4. Create `app/admin/page.tsx` + `loading.tsx` — dashboard with 4 status count cards
5. Create `components/admin/status-count-cards.tsx` — card grid component
6. Create `components/admin/admin-queue-table.tsx` — reusable Shadcn Table
7. Create `app/admin/pending/page.tsx` + `loading.tsx` — pending queue (oldest-first, paginated)
8. Create `app/admin/reports/[id]/page.tsx` — review page with full report + action buttons
9. Create `app/admin/reports/[id]/loading.tsx`, `error.tsx`, `not-found.tsx`
10. Create `app/admin/actions.ts` — `approveReport`, `rejectReport`, `resolveReport` Server Actions
11. Add admin Zod schemas to `lib/validations/report.ts`
12. Create `components/admin/action-buttons.tsx` — approve/reject/resolve with rejection dialog
13. Create `app/admin/approved/page.tsx`, `app/admin/rejected/page.tsx`, `app/admin/resolved/page.tsx` with pagination
14. Modify `proxy.ts` — add admin role check for login redirect
15. Verify build passes (`npm run build`)
16. Update `context/progress-tracker.md`

## Implementation Status

| Item | Status |
|---|---|
| `lib/supabase/service-role.ts` — service role client | ✅ Built |
| `app/admin/layout.tsx` — sidebar layout + admin guard | ✅ Built |
| `components/admin/admin-sidebar.tsx` — sidebar nav | ✅ Built |
| `app/admin/page.tsx` — dashboard | ✅ Built |
| `app/admin/loading.tsx` — dashboard skeleton | ✅ Built |
| `components/admin/status-count-cards.tsx` — dashboard cards | ✅ Built |
| `components/admin/admin-queue-table.tsx` — queue table | ✅ Built |
| `app/admin/pending/page.tsx` — pending queue | ✅ Built |
| `app/admin/pending/loading.tsx` — skeleton table | ✅ Built |
| `app/admin/approved/page.tsx` — approved queue | ✅ Built |
| `app/admin/rejected/page.tsx` — rejected queue (with reason column) | ✅ Built |
| `app/admin/resolved/page.tsx` — resolved queue | ✅ Built |
| `app/admin/reports/[id]/page.tsx` — review page | ✅ Built |
| `app/admin/reports/[id]/admin-report-actions.tsx` — client action wrapper | ✅ Built |
| `app/admin/reports/[id]/loading.tsx` — review skeleton | ✅ Built |
| `app/admin/reports/[id]/error.tsx` — error boundary | ✅ Built |
| `app/admin/reports/[id]/not-found.tsx` — custom 404 | ✅ Built |
| `app/admin/actions.ts` — Server Actions (approve/reject/resolve) | ✅ Built |
| `lib/validations/report.ts` — admin Zod schemas | ✅ Built |
| `components/admin/action-buttons.tsx` — action buttons + rejection dialog | ✅ Built |
| `proxy.ts` — admin login redirect | ✅ Built |
| `npm run build` passes | ✅ Built |
| Progress tracker updated | ✅ Built |

## Check When Done

- [x] Dashboard shows 4 count cards with correct numbers
- [x] Sidebar shows all 5 nav links with active state
- [x] Pending badge shows accurate count
- [x] Sidebar is sticky on scroll
- [x] Admin login redirects to `/admin` (not `/browse`)
- [x] Non-admin users redirected from `/admin` to `/browse`
- [x] Pending queue shows PENDING reports oldest-first
- [x] All queue pages are paginated (20 per page) via URL params
- [x] Clicking a table row navigates to review page
- [x] Review page shows photos, description, map, submitter info
- [x] Approve action works — status changes to APPROVED, redirects to `/admin/pending`
- [x] Reject action works — dialog shows, reason validated (>= 10 chars), status changes to REJECTED
- [x] Resolve action works — status changes to RESOLVED, redirects to `/admin/approved`
- [x] Only valid status transitions allowed (PENDING→APPROVED, PENDING→REJECTED, APPROVED→RESOLVED)
- [x] Rejected reports show rejection reason on review page and queue table
- [x] Resolved reports show resolved_at on review page
- [x] Action buttons hidden for REJECTED and RESOLVED reports
- [x] Loading skeletons render correctly on all pages
- [x] Error boundaries catch rendering crashes
- [x] Empty states render for each queue page
- [x] Not-found page renders for invalid report IDs
- [x] Sonner toasts show on success and error
- [x] Sign out works from sidebar
- [x] `npm run build` passes with zero errors
- [x] No hardcoded hex values — all tokens used
- [x] Admin uses existing token system — no new CSS variables

## Files Added / Modified

### `lib/supabase/service-role.ts` — Service role client

Creates a Supabase client using `SUPABASE_SERVICE_ROLE_KEY` (server-only env var). Used by all admin pages and Server Actions to bypass RLS for cross-user reads and status mutations. Configuration: `autoRefreshToken: false`, `persistSession: false` — this client is stateless and not tied to any user session.

### `app/admin/layout.tsx` — Admin layout

Server Component that:
1. Calls `createSupabaseServerClient()` → `supabase.auth.getUser()` to get the current user
2. Queries `profiles` to confirm `role === "ADMIN"` — redirects non-admins to `/browse`
3. Fetches pending count via `createAdminClient()` (service role) for sidebar badge
4. Renders `AdminSidebar` + children inside a flex container

The layout is the primary page-level authorization guard. Every admin page is wrapped by it.

### `components/admin/admin-sidebar.tsx` — Sidebar navigation

Client component (`"use client"` — uses `usePathname` for active state). Props: `pendingCount`, `adminName`.

Nav items rendered from a static array: Dashboard, Pending, Approved, Rejected, Resolved. Active detection: exact match for `/admin`, prefix match for sub-routes like `/admin/pending`.

Sign out uses `createSupabaseBrowserClient().auth.signOut()` + `router.refresh()`, matching the pattern in `components/public-nav.tsx`.

### `components/admin/status-count-cards.tsx` — Dashboard count cards

Stateless component accepting `items: StatusCount[]` where each item has `label`, `count`, `href`, and `color` (pending/approved/rejected/resolved). Renders a responsive grid (4 cols desktop, 2 cols narrow) of clickable cards. Each card uses a colored left border (`border-l-4 border-l-status-*`) matching the status token.

### `components/admin/admin-queue-table.tsx` — Reusable queue table

Stateless component rendering a Shadcn `Table` from `rows: QueueRow[]`. Columns: Status badge, Submitter name, Category label, Title (truncated with `max-w-[200px]`), Date (via `formatReportDate`), Review link. Optional `showRejectionReason` prop adds an extra column. Returns `null` when rows are empty (empty states handled by parent pages).

### `app/admin/actions.ts` — Admin Server Actions

Three exported actions, each with the same auth → role → validate → mutate → respond pattern:

1. **`approveReport(reportId)`** — Validates reportId as UUID, checks current status is PENDING, sets status to `APPROVED`, `reviewed_by_id`, `reviewed_at`
2. **`rejectReport(reportId, rejectionReason)`** — Validates reportId + reason (>= 10 chars), checks current status is PENDING, sets status to `REJECTED`, `rejection_reason`, `reviewed_by_id`, `reviewed_at`
3. **`resolveReport(reportId)`** — Validates reportId, checks current status is APPROVED, sets status to `RESOLVED`, `resolved_at`

All three:
- Use `createSupabaseServerClient()` for auth (anon key) to call `supabase.auth.getUser()`
- Read `profiles.role` independently to confirm admin
- Use `createAdminClient()` (service role) for the actual UPDATE
- Return `AdminActionResponse: { success: boolean; error?: string }`
- Wrap in try/catch for unexpected errors

Each action enforces the unidirectional status transition invariant: `PENDING→APPROVED`, `PENDING→REJECTED`, `APPROVED→RESOLVED`. Status is never accepted as a free-form client value.

### `components/admin/action-buttons.tsx` — Approve/Reject/Resolve buttons

Client component with two sub-components:

- **`ActionButtons`** — The public parent. Shows conditional buttons based on status:
  - PENDING → Approve (primary) + Reject (destructive), side by side
  - APPROVED → Mark as Resolved (default), standalone
  - REJECTED / RESOLVED → returns null (no actions)
  - Each button calls its Server Action in a `useTransition`, shows spinner during mutation, shows Sonner toast on result, redirects on success

- **`RejectButton`** — Manages its own dialog open/close state, rejection reason text, and submission state. On confirm, calls `onReject(reportId, reason)`, shows toast, redirects on success.

Both are wired to the Server Actions via `AdminReportActions` wrapper (a thin "use client" bridge that imports the server actions and passes them as callback props).

### `proxy.ts` — Admin login redirect

Three additions to the existing route protection in `proxy.ts`:

1. `/admin` is already in `protectedRoutes` — unauthenticated users are redirected to `/login?redirect=/admin`
2. After a user is confirmed authenticated on an auth route (`/login`, `/register`, etc.), the proxy reads `profiles.role` and redirects admins to `/admin` instead of `/browse`
3. The profile query is a fast PK lookup on `profiles.id` (indexed) — adds minimal latency

The proxy does NOT check admin role for `/admin` access — that would require a DB read on every admin request for marginal UX benefit. Role verification is done server-side in the layout and every Server Action.
