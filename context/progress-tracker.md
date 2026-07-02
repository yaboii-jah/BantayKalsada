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

## Current Goal

- Cloudinary integration (photo upload)
- Admin panel
- Email notifications

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

## In Progress

- None.

## Next Up

- Admin panel (moderation queue, approve/reject/resolve)
- Email notifications (Brevo + React Email templates)

## Open Questions

- None.

## Architecture Decisions

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
