# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

- [x] Design System — Complete
- [x] Supabase Auth — Complete
- [x] Auth Pages & Route Protection — Complete
- [x] Public Report Feed — Complete
- [x] Report Submission Form — Complete
- [x] Personal Report History — Complete
- [x] Email & In-App Notifications — Complete

## Current Goal

- Implement App Feedback feature — see `context/feature-specs/15-feedback-feature.md`

## Completed

### Design System

- [x] Initialize shadcn/ui with Radix base (Nova preset)
- [x] Install all required UI components: Button, Input, Textarea, Select, Label, Card, Badge, Dialog, Table, Separator, Sheet, DropdownMenu, Avatar, Skeleton, Alert, Sonner, Tooltip, Carousel, Field (form family)
- [x] Install lucide-react
- [x] Create `lib/utils.ts` with `cn()` helper
- [x] Update `app/globals.css` with project design tokens (colors from ui-context.md + report status tokens)
- [x] Update `app/layout.tsx` — replace Geist with Inter, add JetBrains Mono, wrap with TooltipProvider

### Supabase Client & Auth

- [x] Install `@supabase/supabase-js` and `@supabase/ssr`
- [x] Create `lib/supabase/server.ts` — per-request server client factory using `createServerClient` with cookie handling
- [x] Create `lib/supabase/client.ts` — browser client singleton using `createBrowserClient`
- [x] Create `lib/supabase/middleware.ts` — `updateSession()` helper for session refresh in proxy
- [x] Create `proxy.ts` — Next.js 16 proxy file (replaces deprecated `middleware.ts`) that calls `updateSession` on every request to refresh Supabase auth cookies
- [x] Fix `.env.local` — demote `SUPABASE_SERVICE_ROLE_KEY` from `NEXT_PUBLIC_` to server-only
- [x] Build passes with zero errors; no deprecation warnings

### Auth Pages & Route Protection

- [x] Create `app/(auth)/layout.tsx` — auth route group layout with centered card on gradient background
- [x] Create `app/(auth)/login/page.tsx` — email/password login form with Supabase `signInWithPassword()`, error banner, Suspense-wrapped `useSearchParams()`
- [x] Create `app/(auth)/register/page.tsx` — name/email/password registration with Supabase `signUp()`, "check your email" confirmation state
- [x] Create `app/(auth)/reset-password/page.tsx` — two states: email input with 60s cooldown, new password form via `onAuthStateChange` recovery detection
- [x] Create `components/auth/auth-card.tsx` — split card container (branding 45% + form 55% on desktop, stacked on mobile)
- [x] Create `components/auth/branding-panel.tsx` — logo, tagline, feature highlights with primary-tinted gradient background
- [x] Create `app/browse/page.tsx` — post-login redirect target with empty state ("No reports yet" + "Submit a report" CTA)
- [x] Create `app/verify-email/page.tsx` — prompt for unverified users redirected from `/submit`
- [x] Update `proxy.ts` — route protection rules (authenticated on auth routes → `/browse`, unauthenticated on protected routes → `/login?redirect=`, unverified on `/submit` → `/verify-email`)
- [x] Update `app/globals.css` — add `bg-auth-gradient` utility class
- [x] Apply Hallmark design principles (utilitarian tone, token discipline, mobile-first, no AI slop)

### Public Report Feed

- [x] Create `app/(public)/layout.tsx` — route group with N9 nav + Ft2 footer
- [x] Create `components/public-nav.tsx` — session-aware nav with auth/avatar states, Sheet on mobile
- [x] Create `app/(public)/page.tsx` — landing page with Marquee Hero macrostructure (hero + 3-step + CTA)
- [x] Create `app/(public)/browse/page.tsx` — feed page with Portfolio Grid, URL-param filters, pagination
- [x] Create `app/(public)/browse/loading.tsx` — skeleton grid
- [x] Create `app/(public)/browse/error.tsx` — error boundary with retry
- [x] Create `app/(public)/reports/[id]/page.tsx` — detail page with carousel gallery, metadata, interactive map
- [x] Create `app/(public)/reports/[id]/not-found.tsx` — custom 404 with back button
- [x] Create `app/(public)/reports/[id]/error.tsx` — error boundary
- [x] Create `components/reports/report-status-badge.tsx` — status badge with project tokens
- [x] Create `components/reports/report-card.tsx` — feed card with thumbnail, category, title, location, status
- [x] Create `components/browse/filter-bar.tsx` — category + status selects driving URL params
- [x] Create `components/browse/pagination-bar.tsx` — page numbers with prev/next links
- [x] Create `components/browse/photo-gallery.tsx` — Shadcn Carousel wrapper for report photos
- [x] Create `components/maps/report-map.tsx` — Leaflet MapContainer + Marker (client)
- [x] Create `components/maps/report-map-wrapper.tsx` — dynamic import wrapper with `{ ssr: false }`
- [x] Create `lib/mock-data.ts` — 36 mock reports for development
- [x] Create `lib/date-utils.ts` — fil-PH relative/absolute date formatting
- [x] Install leaflet, react-leaflet, @types/leaflet
- [x] Update `app/globals.css` — add `overflow-x: clip` on html/body per Hallmark
- [x] Fix SelectItem empty string value bug in filter bar

### Report Submission Form

- [x] Install `react-hook-form`, `@hookform/resolvers`, `zod` as direct dependencies
- [x] Create `lib/cloudinary.ts` — Cloudinary config and signature generator
- [x] Create `lib/validations/report.ts` — Zod schema + derived types aligned with DB reports table
- [x] Create `app/api/uploads/sign/route.ts` — GET handler returning signed Cloudinary upload preset
- [x] Create `app/actions.ts` — `submitReport` Server Action (auth → email check → rate limit → Zod validation → insert)
- [x] Create `app/(citizen)/layout.tsx` — route group layout sharing PublicNav + Ft2 footer
- [x] Create `app/(citizen)/submit/page.tsx` — Server Component page rendering ReportForm
- [x] Create `app/(citizen)/submit/loading.tsx` — skeleton loading state
- [x] Create `app/(citizen)/submit/error.tsx` — error boundary with retry button
- [x] Create `components/reports/photo-upload.tsx` — Cloudinary direct-upload widget with dropzone, per-photo progress spinners, remove buttons
- [x] Create `components/maps/location-picker.tsx` — Leaflet map with click-to-pin, drag, GPS "Use My Location" via lucide LocateFixed icon
- [x] Create `components/maps/location-picker-wrapper.tsx` — dynamic import wrapper with `{ ssr: false }`
- [x] Create `components/reports/report-form.tsx` — main client form wiring react-hook-form, Zod resolver, Controller for Select, useTransition for pending state
- [x] Add `<Toaster />` to root layout for Sonner toast notifications
- [x] Build passes with zero errors
- [x] Diagnose and fix browse query returning 0 rows — root cause: RLS policy only covered `anon` role, but `createSupabaseServerClient()` returns an `authenticated` session when user is logged in. Fixed by adding `authenticated` to policy.
- [x] Remove diagnostic logging after fix confirmed
- [x] Fix Cloudinary CDN timeout — created `lib/cloudinary-url.ts` with `getDisplayUrl()` rewriting `res.cloudinary.com` → `res-3.cloudinary.com` (Asia/Pacific regional CDN), applied in `report-card.tsx` and `photo-gallery.tsx`
- [x] Fix Leaflet default marker icon not rendering in bundler — added `L.Icon.Default.mergeOptions()` with explicit unpkg CDN URLs in `report-map.tsx`
- [x] Change report submission status from hardcoded `"APPROVED"` to `"PENDING"` in `app/actions.ts` — requires admin approval before appearing on browse feed
- [x] Re-add `.in("status", baseStatusFilter)` to browse page default query — defense-in-depth alongside RLS to ensure PENDING reports never appear
- [x] Fix `formatReportDate` in `lib/date-utils.ts` — rewrote broken loop logic (wrong iteration order, incorrect count calculation) with clean cascade: <1m "Just now", <1h minutes, <24h hours, <30d days, 30d+ formatted date
- [x] Add date display to report cards on `/browse` — `formatReportDate(report.submitted_at)` rendered with `ml-auto` on the badge row right side
- [x] Bump nav z-index from `z-[1000]` to `z-[1100]` — Leaflet zoom controls and "Use My Location" button both use `z-1000`, causing overlap when scrolling past map

### Personal Report History (`/my-reports`)

- [x] Add optional `href` prop to `ReportCard` — defaults to `/reports/[id]`, overridable for `/my-reports/[id]`
- [x] Create `MyReportsFilter` component — status pill tabs (All / Pending / Approved / Rejected / Resolved) driven by URL search params
- [x] Create `app/(citizen)/my-reports/page.tsx` — Server Component list page with Supabase query filtered by `submitted_by_id`, pagination, card grid, empty state with CTA
- [x] Create `app/(citizen)/my-reports/loading.tsx` — skeleton card grid (6 skeleton cards)
- [x] Create `app/(citizen)/my-reports/error.tsx` — error boundary with retry
- [x] Create `app/(citizen)/my-reports/[id]/page.tsx` — Server Component detail page with photo gallery, metadata, rejection reason Alert banner on REJECTED status, interactive map
- [x] Create `app/(citizen)/my-reports/[id]/loading.tsx` — detail page skeleton
- [x] Create `app/(citizen)/my-reports/[id]/error.tsx` — detail page error boundary
- [x] Create `app/(citizen)/my-reports/[id]/not-found.tsx` — custom 404 with back link
- [x] Change post-submit redirect from `/browse` to `/my-reports` in `report-form.tsx`
- [x] `npm run build` passes with zero errors

### Email & In-App Notifications

- [x] Create `lib/email.ts` — Brevo client wrapper using `@getbrevo/brevo` SDK
- [x] Create `lib/notifications.ts` — shared utility for notification creation + message/subject formatting
- [x] Create `lib/admin-notifications.tsx` — report submitter lookup + email dispatch orchestration
- [x] Create `emails/render.ts` — template string-based email HTML generators (approved, rejected, resolved)
- [x] Update `app/admin/actions.ts` — all three actions (`approveReport`, `rejectReport`, `resolveReport`) now send emails + insert notification rows after status update
- [x] Extract `verifyAdmin` helper to reduce duplication in admin actions
- [x] `npm run build` passes with zero errors

### Admin Panel

- [x] Create `lib/supabase/service-role.ts` — service role client factory for admin DB ops
- [x] Create `app/admin/layout.tsx` — sidebar layout with admin role guard + pending count fetch
- [x] Create `components/admin/admin-sidebar.tsx` — nav sidebar with active state, pending badge, sign out
- [x] Create `app/admin/page.tsx` — dashboard with 4 status count cards
- [x] Create `app/admin/loading.tsx` — skeleton loading state
- [x] Create `components/admin/status-count-cards.tsx` — colored card grid for status counts
- [x] Create `components/admin/admin-queue-table.tsx` — reusable Shadcn Table with status, submitter, category, title, date
- [x] Create `app/admin/pending/page.tsx` — pending queue (oldest-first, paginated)
- [x] Create `app/admin/pending/loading.tsx` — skeleton table
- [x] Create `app/admin/approved/page.tsx` — approved queue (newest-first, paginated)
- [x] Create `app/admin/rejected/page.tsx` — rejected queue with rejection_reason column
- [x] Create `app/admin/resolved/page.tsx` — resolved queue
- [x] Create `app/admin/reports/[id]/page.tsx` — full review page with photos, description, map, submitter info, action buttons
- [x] Create `app/admin/reports/[id]/loading.tsx` — review page skeleton
- [x] Create `app/admin/reports/[id]/error.tsx` — error boundary
- [x] Create `app/admin/reports/[id]/not-found.tsx` — custom 404
- [x] Create `components/admin/action-buttons.tsx` — conditional Approve/Reject/Resolve with loading states, rejection dialog
- [x] Create `app/admin/actions.ts` — Server Actions: approveReport, rejectReport, resolveReport (auth → role check → Zod → service-role update)
- [x] Add admin Zod schemas to `lib/validations/report.ts` — approveReportSchema, rejectReportSchema, resolveReportSchema
- [x] Admin uses Server Actions (not API routes), following the same pattern as `app/actions.ts`
- [x] `npm run build` passes with zero errors; lint clean for all admin code

### In-App Notification Center

- [x] Create `app/actions.ts` — `markNotificationAsRead` Server Action (auth → RLS-guarded update)
- [x] Create `app/actions.ts` — `markAllNotificationsAsRead` Server Action (auth → bulk update all unread)
- [x] Create `components/notification-bell.tsx` — client component with 8 Hallmark states (loading, empty, unread, all-read, open, marking-one, marking-all, error)
- [x] Unread count fetched eagerly on mount via lightweight `COUNT(*)` query with `head: true`
- [x] Notification list fetched lazily on first click of the bell (10 most recent)
- [x] Each notification item shows correct `lucide-react` icon per type (CheckCircle, XCircle, CheckCheck)
- [x] Unread vs read visual distinction: `bg-muted/50` + `border-l-primary` + `font-medium` vs transparent + `text-muted-foreground`
- [x] Unread count badge caps at `99+` to prevent layout overflow
- [x] Clicking a notification marks it read (`startTransition` → Server Action) and navigates to `/my-reports/[id]`
- [x] "Mark all as read" button in dropdown header when unread exist
- [x] Dropdown closes on click outside (mousedown), Escape key, notification click, or mark-all click
- [x] Bell + dropdown only renders in desktop nav (mobile sheet left unchanged for v1)
- [x] No new CSS tokens — all styling uses existing design system variables
- [x] `deleteNotification` Server Action — service-role client, ownership guarded by `eq("user_id", user.id)`
- [x] `clearAllNotifications` Server Action — single bulk delete, same ownership guard
- [x] Per-item `X` button on each notification item — `group-hover:opacity-100`, stops propagation, optimistic removal
- [x] "Clear all" button in header when any notifications exist
- [x] `context/feature-specs/08-in-app-notification.md` written with full spec
- [x] `context/progress-tracker.md` updated

### Full-Text Keyword Search

- [x] `app/(public)/browse/page.tsx` — read `q` from searchParams, apply ILIKE `.or()` filter on title + description
- [x] `components/browse/filter-bar.tsx` — search input with magnifying glass icon, Enter to search, X to clear
- [x] Search query combines with existing category/status filters via AND
- [x] `q` param preserved in pagination links; changing `q` resets page to 1
- [x] Empty/whitespace query treated as no filter
- [x] No database changes (ILIKE only, no migration needed)
- [x] `context/feature-specs/09-search-design.md` written with full spec
- [x] `context/project-overview.md` — moved search from Out of Scope to In Scope
- [x] `context/architecture.md` — search noted
- [x] `npm run build` passes with zero errors

### Map View on Browse Feed

- [x] `components/browse/browse-map.tsx` — Leaflet map with marker clustering (`react-leaflet-cluster`), popups (thumbnail/title/category/status/link), FitBounds
- [x] `components/browse/browse-map-wrapper.tsx` — dynamic import with `{ ssr: false }` + loading skeleton
- [x] `app/(public)/browse/page.tsx` — `view` param, conditional fetch (all results for map, paginated for grid), conditional render, pagination hidden in map view
- [x] `components/browse/filter-bar.tsx` — `LayoutGrid` / `Map` toggle button group, active state, drives `?view=` param
- [x] All filters (category, status, search) apply to both views
- [x] Installed `react-leaflet-cluster` — markers grouped into numbered clusters, handles duplicate coordinates and dense areas
- [x] No database changes
- [x] `context/feature-specs/10-map-view.md` written with full spec
- [x] `context/project-overview.md` — map view noted
- [x] `context/architecture.md` — map view noted
- [x] `npm run build` passes with zero errors

### Google OAuth Login

- [x] `app/auth/callback/route.ts` — exchanges OAuth code for session via `exchangeCodeForSession()`
- [x] `components/auth/google-sign-in.tsx` — branded button with Google SVG logo, loading/error states
- [x] `app/(auth)/login/page.tsx` — Google button + "or" divider above form
- [x] `app/(auth)/register/page.tsx` — "Sign up with Google" button + "or" divider
- [x] OAuth sessions handled by existing auth model — no proxy/layout/Server Action changes needed
- [x] Database trigger creates profiles from Google's `full_name` metadata automatically
- [x] No server-side packages added
- [x] `context/feature-specs/11-oauth-google.md` written with full spec
- [x] `context/project-overview.md` — moved OAuth to In Scope
- [x] `context/architecture.md` — OAuth noted
- [x] `npm run build` passes with zero errors

### Google OAuth Callback Fix

- [x] Fix `app/auth/callback/route.ts` — replaced `NextResponse.next()` (unsupported in route handlers) with `request.cookies.set()` for session cookies during `exchangeCodeForSession`, then copied cookies to redirect response
- [x] Added error handling — failed exchange falls through to `/login?error=OAuth failed` redirect
- [x] `npm run build` passes with zero errors

### Loading Spinner on Filter Navigation

- [x] Created `components/reports/reports-grid-skeleton.tsx` — skeleton cards matching ReportCard layout (thumbnail, badge row, title lines) + `MapSkeleton` with spinning loader
- [x] Refactored `app/(public)/browse/page.tsx` — extracted data fetching + rendering into `BrowseReports` async sub-component, wrapped in `<Suspense>` with `key` derived from search params, fallback shows `<ReportsGridSkeleton />` or `<MapSkeleton />` depending on view
- [x] Refactored `app/(citizen)/my-reports/page.tsx` — same pattern: `MyReportsContent` async sub-component in `<Suspense key={...}>` with skeleton fallback
- [x] Moved report count text from filter bars into the Suspense-wrapped content components so count updates accurately with each filter change
- [x] Removed `totalCount` prop from `FilterBar` and `MyReportsFilter` (count now rendered inside async content)
- [x] `npm run build` passes with zero errors

### Browse Dropdown Filter Clipping Fix

- [x] Fixed `InlineSelect` in `components/browse/filter-bar.tsx` — dropdown menus were clipped by parent `overflow-x-auto` container on mobile (visible in DOM but invisible to user)
- [x] Renders dropdown via `createPortal` to `document.body` with `position: fixed` calculated from trigger button's `getBoundingClientRect()`
- [x] Added scroll/resize listeners to reposition the portal dropdown
- [x] Click-outside detection checks both the trigger container and the portal menu element
- [x] Added `shrink-0` to prevent trigger button from collapsing in flex layout
- [x] `npm run build` passes with zero errors

### Feedback Form Photo Upload Fixes

- [x] Fixed React warning in `components/reports/photo-upload.tsx` — `syncToParent` was called inside `setPhotos` state updater functions (upload handler + removePhoto), triggering "Cannot update a component while rendering a different component" warning
- [x] Replaced with a `useEffect` that syncs `photos` to parent via `onChangeRef.current(urls)` whenever `photos` changes — runs outside the render phase
- [x] Added `console.error("submitFeedback insert error:", insertError)` in `app/actions.ts` to log the actual database error for debugging
- [x] `npm run build` passes with zero errors

### Mobile Hamburger Sheet Z-Index Fix

- [x] Fixed `components/ui/sheet.tsx` — Sheet overlay and content were at `z-50`, below the sticky nav header at `z-[1100]`, causing the nav bar to cover the Sheet panel on mobile
- [x] Bumped Sheet overlay and Sheet content from `z-50` to `z-[1200]` — above the header (`1100`) and Leaflet controls (`1000`)
- [x] `npm run build` passes with zero errors

### Mobile Nav Polish (Issues from current-issues.md)

- [x] Shrunk mobile hamburger sidebar from `w-72` to `w-64` — less screen real estate taken on mobile
- [x] Centered nav links inside the mobile sheet (`items-center` on flex column)
- [x] Created `app/(public)/reports/[id]/loading.tsx` — skeleton matching the detail page layout (back button, badges, title, photo, metadata, description, map) to avoid blank page during navigation
- [x] Fixed `/feedback` page missing horizontal padding on mobile — added `px-4 sm:px-6 lg:px-8` to both `feedback/page.tsx` and `feedback/loading.tsx` (matching `/submit` layout)
- [x] Removed `NotificationBell` from mobile sheet (component designed for inline desktop nav, not full-width flex layout)
- [x] Added "My Feedback" link to mobile sheet nav for logged-in users — previously missing, only accessible via desktop avatar dropdown
- [x] Moved Sign out button to bottom of mobile sheet via `flex-1` spacer — common mobile pattern
- [x] Added `px-4 pb-6` to mobile `SheetContent` — side padding and bottom margin so content isn't flush to edges
- [x] Fixed `/my-feedback` loading skeleton missing mobile padding — wrapped `<ReportsGridSkeleton>` in `mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8` container
- [x] Fixed `/my-feedback/[id]` missing mobile padding — added `px-4 sm:px-6 lg:px-8` to page container
- [x] Created `/my-feedback/[id]/loading.tsx` — skeleton matching the feedback detail card layout
- [x] `npm run build` passes with zero errors

### Map-Driven Bounding Box Filter

- [x] `components/browse/browse-map.tsx` — Added `MapContent` component that tracks map viewport via `useMapEvents`, computes `visibleReports` client-side via `bounds.contains()`, renders only visible markers in `MarkerClusterGroup`, and shows a dynamic count bar ("Showing X of Y reports in this area") with a Reset button
- [x] Removed `FitBounds` component (logic merged into `MapContent`)
- [x] `app/(public)/browse/page.tsx` — Removed server-rendered count from map view branch (count now lives in the client map component and updates reactively)
- [x] Pure client-side — no server round-trip on pan/zoom, no URL params pushed
- [x] `context/feature-specs/13-bounding-box-filter.md` written with full spec
- [x] `context/project-overview.md` — moved from Out of Scope to In Scope
- [x] `context/architecture.md` — noted in browse section
- [x] `npm run build` passes with zero errors

### Admin Analytics Dashboard

- [x] Installed `recharts` — SVG chart library
- [x] Created `components/admin/analytics-charts.tsx` — client component with 3 charts (area chart for submissions over time, horizontal bar chart for category distribution, donut chart for status distribution) and 4 metric cards (approval rate %, avg resolution hours, total reports, reports this month)
- [x] Updated `app/admin/page.tsx` — replaced 4 separate `head: true` count queries with a single query fetching `submitted_at, category, status, resolved_at`, computing all metrics server-side
- [x] Updated `app/admin/loading.tsx` — added skeleton blocks for metric cards and chart areas
- [x] `context/feature-specs/14-admin-analytics.md` written with full spec
- [x] `context/project-overview.md` — moved from Out of Scope to In Scope
- [x] `context/architecture.md` — noted in admin section
- [x] `npm run build` passes with zero errors

## Next Up

### App Feedback (Current Feature — Complete)
- [x] Migration 1: notification_type enum values (non-transaction)
- [x] Migration 2: feedback tables, RLS, indexes
- [x] Supabase types regenerated (`database.types.ts`)
- [x] Notification bell updated — handles FEEDBACK_ACKNOWLEDGED / FEEDBACK_CLOSED types
- [x] Zod schemas, Server Actions, email templates
- [x] Citizen pages (/feedback, /my-feedback, /my-feedback/[id])
- [x] Admin pages (/admin/feedback, /admin/feedback/[id])
- [x] Nav + sidebar links, notification bell updates
- [x] Fixed /my-feedback page layout — added `mx-auto max-w-7xl` centering wrapper
- [x] Fixed avatar dropdown — "Feedback" renamed to "My Feedback", links to `/my-feedback`
- [x] Replaced Radix Select in feedback form with inline custom dropdown (fixes body scroll lock layout shift)
- [x] `/my-feedback` added to middleware `protectedRoutes` — unauthenticated users redirected to `/login?redirect=/my-feedback`
- [x] Server-side auth guard on both `/my-feedback` and `/my-feedback/[id]` — `return null` replaced with `redirect("/login?redirect=/my-feedback")`
- [x] Feedback card status badge overflow fix — added `flex-wrap` to badges row
- [x] **Photo uploads**: Migration 3 adds `photo_urls text[]` to feedback table
- [x] **Zod**: `createFeedbackSchema` extended with optional `photo_urls` (max 3)
- [x] **Server Action**: `submitFeedback` now inserts `photo_urls`
- [x] **Form**: `PhotoUpload` component integrated into `FeedbackForm`, emits URLs on submit
- [x] **Detail pages**: `PhotoGallery` (reused carousel) shown on citizen + admin feedback detail pages
- [x] `npm run build` passes

### Quick Wins (v2.0)
- **Share report via link/social** — OG meta tags on report detail pages + share button via `navigator.share()`
- **Dark mode** — `next-themes` integration with existing CSS tokens, toggle in nav
- **PWA support** — `manifest.json`, service worker, install prompt
- **Bulk admin actions** — multi-select checkboxes on queue pages with batch approve/reject Server Action
- **Export admin reports to CSV** — server-generated CSV download button

### Community Features (v2.1)
- **Report confirmations ("I saw this too")** — new `confirmations` table, +1 button on reports, credibility badge
- **Comments on reports** — threaded discussion with admin moderation
- **Report severity tagging** — Minor / Urgent / Emergency label on submission form
- **Nearby existing reports on submit** — show existing reports within X meters when pinning a location

### Mobile & Notifications (v2.2)
- **Push notifications** — service worker + Supabase Realtime for real-time status alerts
- **Offline submission** — queue report data in localStorage, submit on reconnect
- **Geographic search / barangay filter** — filter browse feed by location

### Admin Power Tools (v3.0)
- **Report editing by admin** — allow admins to fix typos, recategorise, adjust map pin
- **Citizen report flagging** — "Already fixed" / "Wrong location" button on report pages
- **Activity log / audit trail** — view who approved/rejected each report and when
- **Report lifecycle timeline** — visual timeline on detail page (submitted → reviewed → resolved)

### Ecosystem (v3.0+)
- **LGU / DPWH dashboard** — region-scoped admin roles with filtered view
- **Public REST API** — expose approved reports to third-party consumers
- **SMS notifications** — integration with Philippine SMS gateway (Semaphore, Chikka)
- **Multi-language support** — Filipino + English + Cebuano/Ilocano

## Open Questions

- None.

## Architecture Decisions

### Email + In-App Notifications

- **Template strings over React Email** — `react-dom/server` is not importable in Next.js App Router Server Components/Server Actions. `@react-email/components` was not installed. Instead, email HTML is generated via template string functions in `emails/render.ts`. Each returns a full HTML document with inline styles — minimal, deliverable, and dependency-free.
- **Fire-and-forget notification dispatch** — Email + notification insertion happens after the status update succeeds, wrapped in `.catch()` so failures are logged but never block the status transition. This ensures report moderation is never gated on email deliverability.
- **Separate server-only module for JSX** — `lib/admin-notifications.tsx` uses `.tsx` extension because it contains JSX (React.createElement calls from the email template functions). The `"use server"` actions file (`app/admin/actions.ts`) stays `.ts` and delegates JSX work to this helper.
- **`verifyAdmin()` extracted** — The auth + admin role check was duplicated across all three actions. Extracted into a shared helper with explicit discriminated union return type for clean TypeScript narrowing.
- **Notifications table populated** — The `notifications` table (already designed in `data-model.md` and created on live DB) is now written to by all three admin actions. Ready for v1.1 notification center with zero schema changes.

- **Auth gradient** — `bg-auth-gradient` utility added to `globals.css`: a subtle three-stop gradient using project OKLCH tokens (light blue to white to light indigo).
- **Auth card layout** — `components/auth/auth-card.tsx` contains the split layout: branding panel (left 45%) + form (right 55%) on desktop, stacked on mobile. The card IS the container (no nested cards).
- **Branding panel** — `components/auth/branding-panel.tsx` shows logo, tagline, and feature highlights on a subtle primary-tinted background. Hidden on mobile; replaced with a minimal footer note in the form column.
- **Error handling** — `Alert` banner at top of form for Supabase errors. Inline Zod validation to be added with react-hook-form later (not installed yet).
- **proxy.ts route protection** — three rules added: (1) authenticated users on auth routes → `/browse`, (2) unauthenticated on protected routes → `/login` (with `?redirect=` param), (3) unverified on `/submit` → `/verify-email`.
- **Post-login redirect** — defaults to `/browse` (configurable via `DEFAULT_AUTH_REDIRECT` constant or env var in future).
- **Reset-password cooldown** — 60s countdown on "Send again" button to prevent Supabase rate-limit issues. Token detected via `supabase.auth.onAuthStateChange` listening for `PASSWORD_RECOVERY` event.
- **Social login** — omitted from v1.
- **Post-submit redirect** — now redirects to `/my-reports` so the citizen sees their PENDING report immediately after submission.
- **ReportCard href prop** — Added optional `href` prop to `components/reports/report-card.tsx`. When omitted, defaults to `/reports/${id}` (backward compatible with `/browse`). Used in `/my-reports` to link cards to `/my-reports/${id}`.
- **Status pill tabs** — `MyReportsFilter` uses inline `<button>` elements with primary/ghost styling, no Radix dependencies, avoiding the portal scroll-lock issue that affected the browse filter bar. Filters driven by `?status=` URL param.
- **Rejection reason display** — Shown as an amber-tinted Alert banner (`bg-status-rejected/10 text-status-rejected border-status-rejected/20`) with XCircle icon, only on the `/my-reports/[id]` detail page when `status === "REJECTED"`. Not shown on the list card.
- **My Reports matches browse macrostructure** — Same responsive card grid (1→2→3→4→5 cols), same `PaginationBar` component, same page container. Consistent with the Hallmark utilitarian civic-safety aesthetic: no novel layout for novelty's sake.
- **Admin panel — Server Actions over API routes** — All admin mutations (approve, reject, resolve) use Server Actions in `app/admin/actions.ts`, consistent with the citizen `submitReport` pattern. Each action is a dedicated function with hard-coded target status — status is never a free-form client-supplied value, satisfying the architecture invariant.
- **Admin panel — service role client** — `lib/supabase/service-role.ts` provides `createAdminClient()` using `SUPABASE_SERVICE_ROLE_KEY` for operations that bypass RLS (reading all reports, reading all profiles, performing status transitions). The regular server client (anon key) is used only for auth verification and role checking.
- **Admin panel — layout guards** — `app/admin/layout.tsx` verifies `profile.role === 'ADMIN'` server-side on every page request, redirecting non-admins to `/browse`. Server Actions independently re-verify the admin role. This satisfies the "verify in every handler" invariant without middleware complexity.
- **Admin panel — Hallmark Workbench macrostructure** — Admin uses a persistent sidebar + content canvas layout (utilitarian genre). Token discipline: 100% `var(--*)` references, zero inline hex. All states defined: loading (skeleton), empty (icon + message), error (error boundary), success (toast). No fabricated metrics, no italic headers, no re-drawn chrome.
- **Admin panel — review page** — Single-column layout (`max-w-4xl`): header → photo carousel → description → map → submitter info → reviewer history → rejection reason alert → action buttons. Reuses `PhotoGallery`, `ReportMapWrapper`, `ReportStatusBadge`, and `PaginationBar` from existing components.
- **Admin panel — rejection dialog** — Inline Shadcn Dialog within `action-buttons.tsx`, not a separate component file. Handles states: closed, open, textarea-empty (confirm disabled), valid (≥10 chars), submitting, error. Follows the Hallmark component-scope 8-state discipline.

## Session Notes

- Login page wraps `useSearchParams()` in `<Suspense>` per Next.js requirement.
- Reset-password page detects recovery token via `supabase.auth.onAuthStateChange` (not `window.location.hash` in initializer).
- Branding panel uses `lucide-react` ShieldCheck icon as logo placeholder — to be replaced with actual logo SVG when available.
- Browse empty state shows "No reports yet" with Map icon and CTA to `/submit` (protected by proxy.ts).
- Pre-existing lint error in `carousel.tsx` (Shadcn/ui component) ignored — not in scope.
- Hallmark applied throughout: Portfolio Grid macrostructure for browse, Marquee Hero for landing, N9 edge-aligned nav, Ft2 inline footer, token discipline, overflow-x: clip, no hardcoded hex values.
- Mock data in `lib/mock-data.ts` provides 36 mock reports for development — swap with real Supabase query when DB is live.
- `app/page.tsx` moved to `app/(public)/` route group to inherit public nav + footer.
- Old `app/browse/page.tsx` deleted in favor of `app/(public)/browse/page.tsx`.
- URL search params drive filtering and pagination (`?category=POTHOLE&status=APPROVED&page=2`).
- Leaflet + React Leaflet installed. Interactive map on detail page uses `next/dynamic` with `{ ssr: false }` via a client wrapper (`components/maps/report-map-wrapper.tsx`).
- `npm run build` passes with zero errors.
- **Layout shift fix**: Radix Portal triggers body scroll lock (`overflow: hidden`) in `radix-ui@1.5.0` with no `modal` prop to disable it. Replaced portaled DropdownMenu (avatar) and portaled Select (filter bar) with custom inline button+popup components. CSS-only approaches (`scrollbar-gutter: stable`, `overflow-y: scroll` on `html`) don't work because Radix inline styles override them.
- **Server Action over API Route** — Submission uses a Server Action (`app/actions.ts`) instead of the originally planned `POST /api/reports` route handler, following Next.js v16's recommended pattern for form mutations in first-party apps.
- **Photo upload flow** — Browser uploads directly to Cloudinary using a signed preset from `/api/uploads/sign`. Photos never pass through Next.js. Cloudinary URLs are stored on the report record.
- **useTransition for pending state** — The form uses React's `useTransition` (not `useActionState`) because react-hook-form handles form state and the Server Action accepts structured data, not FormData.
- **Hallmark design applied** — Utilitarian tone (civic safety tool), locked tokens (no inline hex), mobile-first (photo upload + map touch-interactive), per-photo loading states, no AI-slop copy or fabricated content. Pre-emit critique: P5 H4 E5 S4 R4 V5.
- **Zod v4** — The project uses Zod v4. `ZodError` uses `.issues` (not deprecated `.errors`).
- **Post-submit redirect** — Now redirects to `/my-reports` so the citizen can see their PENDING report immediately. Updated in `components/reports/report-form.tsx`.
- **Rate limiting** — 5 reports per 24h, enforced server-side in the Server Action by counting the authenticated user's `reports` rows with `submitted_at` within the window.
- **RLS for authenticated users** — `createSupabaseServerClient()` returns an `authenticated` session when the user is logged in. The original browse RLS policy only covered `anon`, causing 0 rows for logged-in users. Fixed by adding `authenticated` to the `"Public can read approved and resolved reports"` policy.
- **Cloudinary Asia/Pacific CDN** — The user's ISP cannot reach `res.cloudinary.com`. Fixed by creating `lib/cloudinary-url.ts` with `getDisplayUrl()` that rewrites to `res-3.cloudinary.com` (regional CDN). Applied at render sites in `report-card.tsx` and `photo-gallery.tsx`.
- **Leaflet default marker icon** — In bundler environments, Leaflet's default marker icon fails because CSS-expected image paths don't exist. Fixed by calling `L.Icon.Default.mergeOptions()` with unpkg CDN URLs in `report-map.tsx`.
- **date-utils formatReportDate** — Original implementation had a buggy loop: iterated smallest→largest unit but checked `diff < unit.ms`, making minutes unreachable, and calculated count as `diff / (unit.ms / 60_000)` producing wildly inflated numbers. Rewritten as a clean cascade with correct unit division.
- **Leaflet default marker icon** — In bundler environments (Next.js), Leaflet's default marker icon fails because the CSS-expected image paths don't exist. Fixed by calling `L.Icon.Default.mergeOptions()` with explicit unpkg CDN URLs in `report-map.tsx`. The submit page's `location-picker.tsx` already used a custom `L.icon()` and was unaffected.
- **Admin panel — Hallmark pre-emit critique** — P5 H5 E4 S5 R5 V3. Variety scored lower intentionally: admin UIs should be consistent, not varied. Audit: completed /grilling with Hallmark plan before implementation. Every design choice was gated through the user (Server Actions vs API routes, single-column review, status column in tables, submitter info display).
- **Admin panel — pending queue badge** — Count fetched server-side in `layout.tsx` using service role client, passed as prop to `AdminSidebar`. Shown as an amber pill `bg-status-pending/10 text-status-pending`. Only visible when count > 0.
- **Admin panel — post-action redirect** — After approve/reject, redirects to `/admin/pending`. After resolve, redirects to `/admin/approved`. Uses `router.push()` + `router.refresh()` in client component callbacks.
- **Admin panel — no proxy role check** — The proxy (`proxy.ts`) protects `/admin` from unauthenticated access but does not check admin role. Role verification is handled in the layout (page-level) and in every Server Action (mutation-level), satisfying the architecture's "verify in every handler" invariant without adding a DB read to middleware.
- **Admin panel — queue raw vs paginated** — All four queue pages fetch paginated data using URL search params (`?page=N`), 20 items per page. Uses existing `PaginationBar` component. Total count shown in page header.
- **Admin panel — Sign Out** — Uses client-side `supabase.auth.signOut()` + `router.refresh()`, matching the pattern in `components/public-nav.tsx`. No custom sign-out endpoint needed.
- **Admin login redirect** — `proxy.ts` now reads `profiles.role` after auth on auth routes. Admin users are redirected to `/admin` instead of `/browse` after login. Change is in proxy.ts only.
- **Admin sidebar sticky** — Sidebar uses `sticky top-0 h-screen` so it stays fixed on scroll. Main content area uses `overflow-y-auto` for independent scrolling.
- **Notifications — Brevo SDK v5 client** — Uses the new `@getbrevo/brevo` SDK (class-based `BrevoClient` with `apiKey` auth, not the old `TransactionalEmailsApi` static class). The SDK wraps the Brevo REST API with typed request/response objects. Sender name set to "Bantay Kalsada".
- **Notifications — template strings over React Email** — `react-dom/server` (`renderToStaticMarkup`) is rejected by Next.js 16 App Router. `@react-email/components` was not installed. Email HTML is built via template literal functions in `emails/render.ts`, each producing a complete HTML document with inline styles. Avoids the render pipeline conflict entirely.
- **Notifications — `.ts` vs `.tsx` lesson** — Turbopack cannot parse JSX in files with `.ts` extension even when the JSX is in server-only modules. `lib/admin-notifications.tsx` uses `.tsx` because it renders email template functions. `app/admin/actions.ts` and `emails/render.ts` stay `.ts` (no JSX). `emails/render.ts` was originally `render.tsx` then reverted to `.ts` after switching to template strings.
- **Notifications — fire-and-forget email dispatch** — Email + notification insertion is fire-and-forget (`.catch()`), not awaited. The admin gets `{ success: true }` immediately after the status update. Failed emails are logged server-side. This decision was made to prevent transient Brevo API failures from blocking report moderation.
- **Notifications — `verifyAdmin()` extraction** — The auth + role check pattern (getUser → profiles.role → return error) was identical across all three admin actions. Extracted into a shared helper returning a discriminated union type for clean narrowing.
