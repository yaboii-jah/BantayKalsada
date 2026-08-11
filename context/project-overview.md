# Bantay Kalsada

## Overview

Bantay Kalsada is a community-driven road incident reporting web application built for residents of Taytay, Rizal. It allows registered users to submit reports of road hazards — such as potholes, flooded roads, broken traffic signs, and road accidents — by providing a title, description, category, barangay, between one and three photos, and a pinned map location (which must fall within Taytay's municipal boundary). Users register with an email and password and must verify their email address before submitting reports. Submitted reports go through an administrator moderation queue before becoming publicly visible. Approved reports appear in a public feed that any visitor can browse, search, and filter, giving road users actionable awareness of hazards in their area.

## Goals

1. Enable any registered and verified citizen to submit a road incident report in under two minutes, including at least one photo and a map pin.
2. Give administrators a clear moderation queue where every submitted report is reviewed and actioned — approved, rejected with a reason, or resolved — within 48 hours.
3. Provide a publicly accessible, filterable feed of approved road hazard reports so that any visitor can browse known hazards without needing an account.

## Core User Flow

1. A visitor registers for an account using their name, email, and password.
2. The visitor verifies their email address by clicking a link sent to their inbox.
3. The verified citizen logs in and clicks "Submit Report."
4. The citizen fills out the report form: selects a category, enters a title and description, uploads between one and three photos, and pins the incident location on the map — nearby existing APPROVED/RESOLVED reports appear as colored chip markers to help identify duplicates.
5. The citizen submits the report; it is saved with a `PENDING` status and a confirmation email is sent.
6. An administrator logs in to the admin panel and opens the pending report queue.
7. The administrator reviews the report's full details — photos, description, category, and pinned location.
8. The administrator approves the report; its status changes to `APPROVED` and the reporter receives an email notification.
9. The approved report appears on the public feed, visible to all visitors without an account.
10. When the issue is addressed, the administrator marks the report as `RESOLVED`; the reporter receives a resolution email notification.
11. The resolved report remains visible on the public feed with a "Resolved" badge.

## Features

### Public Feed (No Account Required)

- Browse all approved and resolved road incident reports in a paginated list.
- View the full details of any approved report: title, category, barangay, status badge, description, photo gallery (up to 3 photos), pinned map location, and submission date.
- Filter reports by category (Pothole, Flooded Road, Road Accident, Road Rage, Other Road Hazard).
- Filter reports by status (Approved, Resolved).
- Filter reports by barangay (Dolores, San Isidro, San Juan, Santa Ana, Muzon).

### Citizen Reporting

- Register for an account with a name, email, and password.
- Verify email address by clicking a link sent to the inbox; email verification is required before submitting reports.
- Log in and log out securely.
- Reset a forgotten password via an emailed reset link.
- Submit a road incident report with a required title, description, category, barangay (selected from a dropdown), between one and three photos (each up to 10 MB), and a pinned map location that must fall within Taytay's municipal boundary.
- Use the device's GPS to automatically center the map on the current location.
- Add, preview, and individually remove photos before submitting (minimum 1, maximum 3).
- See nearby existing APPROVED/RESOLVED reports as severity-colored chip markers on the map when pinning a location — tap a chip to view report summary and navigate to full details.
- Receive an email notification when a submitted report is approved, rejected (with the rejection reason), or resolved.
- View a personal report history listing all own submissions with their current status.
- View the rejection reason for any rejected report in the personal report history.

### Admin Moderation

- Access a protected admin panel, separate from the citizen-facing UI, at `/admin`.
- View a paginated queue of all pending reports sorted by submission date (oldest first).
- Open a report to review its full details: submitter name, email, category, barangay, title, description, photo gallery (up to 3 photos), pinned location, and submission timestamp.
- Approve a report, changing its status to `APPROVED` and triggering an email notification to the reporter.
- Reject a report with a mandatory written reason, changing its status to `REJECTED` and sending the reason to the reporter via email.
- Mark an approved report as `RESOLVED`, triggering an email notification to the reporter.
- View separate lists of approved, rejected, and resolved reports for audit and record-keeping.
- View an admin analytics dashboard with status counts, submission trend chart (30 days), category distribution, status distribution donut, approval rate, and average resolution time.

## Scope

### In Scope

- User registration, email verification, login, and password reset via Supabase Auth, with Google OAuth login.
- Report road incident submission with a minimum of 1 and a maximum of 3 photos (each up to 10 MB; JPEG/PNG/WebP/HEIC) and a required map pin. Offline, type/size validation is skipped so any captured image is retained locally and uploaded on reconnect.
- Five predefined report categories: Pothole, Flooded Road, Road Accident, Road Rage Incident, Other Road Hazard.
- Admin moderation queue with approve, reject (with reason), and resolve actions.
- Report status lifecycle: `PENDING → APPROVED → RESOLVED` and `PENDING → REJECTED`.
- Public report feed with category and status filters, keyword search, and map view.
- Email notifications to reporters on report approval, rejection, and resolution.
- Citizen personal report history with status and rejection reason visibility.
- Admin panel with report counts and status-separated lists, plus analytics dashboard (charts for submissions over time, category/status distribution, approval rate, and average resolution time).
- Image upload to Cloudinary with EXIF metadata stripped on upload.
- Interactive map using Leaflet.js and OpenStreetMap tiles.
- Rate limiting: maximum 5 report submissions per citizen per 24-hour window.
- In-app notification center: bell icon with unread badge, lazy-loaded dropdown, mark as read, and delete/clear all.
- Map-view bounding box filter: as the user pans/zooms the map on `/browse?view=map`, markers and report count auto-constrain to the current viewport.
- Browse map heatmap: a Markers/Heatmap toggle on `/browse?view=map` shows overall hazard density across Taytay, weighted by report severity (Minor/Urgent/Emergency).
- Browse map base layer toggle: a **Street / Terrain / Satellite** selector on `/browse?view=map` switches between OSM, OpenTopoMap, and ESRI World Imagery tile sources.
- App feedback system: any logged-in user can submit bug reports, feature requests, or general feedback with an optional 1–5 star rating. Admins view submissions in a dedicated inbox and can acknowledge or close them. Status changes and admin notes trigger in-app notifications and emails. Admins can add, edit, and remove internal notes on feedback submissions that are visible to the citizen.
- Progressive Web App (PWA) support: manifest.json for installability, service worker for offline caching (static assets, pages, and images), and an in-app install banner.
- Share report via link/social: Open Graph meta tags on report detail pages for rich link previews on social platforms, plus an in-app share button using the Web Share API with clipboard fallback.
- Comments on reports: any logged-in user can comment on approved/resolved reports on the public detail page. Single-level threading (reply to top-level only). Editing and deletion by the comment author. Admin moderation via soft-delete (status = REMOVED). Report owner receives an in-app notification when someone comments.
- Citizen report flagging: any logged-in non-owner can flag an approved/resolved report as "Already fixed" or "Wrong location" on the public detail page. Flags are private (never shown publicly), independently toggleable per type, and a citizen can have both flags on a report at once. Admins see flags on the report review page, a Flags count badge in the sidebar, an in-app notification on each new flag, and a `/admin/flags` queue listing flagged reports.
- Barangay field on reports: required dropdown on submission (Dolores, San Isidro, San Juan, Santa Ana, Muzon) manually selected by the citizen from an InlineSelect dropdown.
- Municipality boundary enforcement: all pinned locations validated against Taytay boundary polygon at the database level (`trg_reports_location_boundary` trigger) and application level (`is_within_boundary` RPC in Server Action).
- SMS notifications: citizens can opt in with a Philippine mobile number on the Account Settings page and receive SMS alerts when their reports are approved, rejected, or resolved. Powered by PhilSMS API (`/api/v3/sms/send`), with configurable base URL via `PHILSMS_API_BASE` env var (default `https://app.philsms.com`). Includes a "Send Test SMS" button on the account page and an admin-only diagnostic endpoint (`GET /api/sms/diagnose`) that probes both old and new PhilSMS API domains. Retry up to 3 times with 1s delay; failures logged but never block the status transition.
- Export admin reports to CSV: server-generated CSV download from any admin queue page and the dashboard. Admin-only `GET /api/admin/export?status=` endpoint returns a BOM-prefixed UTF-8 CSV with full report details and submitter info.
- Push notifications: web push via VAPID keys, `web-push` server library, and `PushSubscriptionManager` component. Citizens can enable/disable on Account Settings. Notifications sent on report approval, rejection, resolution, feedback notes, and new comments. Supabase Realtime channel (`postgres_changes` on `notifications` table) provides live unread count updates on the notification bell badge.
- Public REST API: read-only JSON API (`GET /api/reports`, `GET /api/reports/[id]`) exposing approved/resolved reports to third-party consumers. Anonymous access gated by RLS + a curated field whitelist; DB-backed rate limiting (120 req/hour + 1,000/day per IP hash via `api_request_log`); edge caching (`s-maxage=60`) and CORS enabled. Contract is designed to stay additive for the multi-municipality roadmap (`?municipality=` param/field later).
- Offline report submission: a citizen on a flaky or absent connection can complete a full report on `/submit` (including selecting photos and pinning a location) and submit it. The report is queued locally in IndexedDB (photos stored as `File` blobs) and replayed through the normal `submitReport` Server Action when connectivity returns — all existing server-side guards (auth, verified email, 5/24h rate limit, Taytay boundary RPC, Zod, DB trigger) still apply at submit time. Drafts are user-scoped. Auto-submit on mount/`online`/visibility change; failed attempts keep the draft with the error and are surfaced in a "Saved offline reports" panel on `/my-reports` with Retry and Discard. Scope: new report submissions only — edits, feedback, and comments remain online-only.
- Social/SEO polish: root `metadataBase` + default `opengraph-image`/`twitter-image` (generated via `next/og`), per-page metadata for the landing and browse pages, a static `sitemap.xml` (public pages), `robots.txt` (blocks admin/api/citizen/auth routes), and JSON-LD `Organization`/`WebSite` schema on the landing page. Ensures rich link previews when sharing on social/messaging apps and proper search-engine discoverability.
- Admin trust features: an admin can edit a report's details (title, description, category, severity, barangay, photos, pin) after submission, with an in-app `REPORT_EDITED` notification to the submitter (no email/SMS). Every lifecycle event is written to a service-role-only `report_activity_log` audit trail (submit, edit, approve, reject, resolve, duplicate link/unlink, merge, comment removal) and rendered as a chronological report timeline on the admin review and citizen detail pages. Admins can link a report as a duplicate of a canonical report or fully merge it (comments + flags reassigned, photos deduplicated capped at 3); the duplicate is retired via `reports.duplicate_of_id` and never hard-deleted, and duplicate reports show a banner linking to the canonical report on the public, citizen, and admin detail pages.
- Observability (Tier 5): Sentry error monitoring (errors only — no tracing, no session replay, no logs) covering the Node server, edge runtime, and browser, with source maps uploaded at build when `SENTRY_AUTH_TOKEN` is set; plus Plausible first-party analytics (cookie-less page views + custom events for report submitted/queued, offline submit, share, flag, comment, feedback, signup, login, and admin approve/reject/resolve). Both are env-guarded — the app builds, runs, and stays inert when `NEXT_PUBLIC_SENTRY_DSN` / `NEXT_PUBLIC_PLAUSIBLE_SRC` are unset.

### Out of Scope

- Native iOS or Android mobile applications.
- Facebook or other OAuth login providers — planned for v1.1.
- Comment list pagination — currently shows all comments without pagination.
- User account management by admins (suspend, ban, or delete users).
- Integration with government systems such as MMDA, DPWH, or LGU APIs.
- AI-assisted moderation or duplicate detection.
- Multi-role or region-scoped administrator accounts.
- Multi-municipality or nationwide deployment — currently scoped to Taytay, Rizal only. (See the **Future Plan** section — this is the stated long-term direction, phased and gated, not yet In Scope.)

## Success Criteria

1. A registered and verified citizen can submit a road incident report — including between one and three photos and a map pin — and see it appear in their personal report history with a `PENDING` status.
2. An administrator can log in to the admin panel, open a pending report, and approve it; the approved report immediately appears on the public feed and the reporter receives an approval email.
3. An administrator can reject a pending report with a written reason; the reporter sees the rejection reason in their personal report history.
4. An administrator can mark an approved report as resolved; the report displays a "Resolved" badge on the public feed and the reporter receives a resolution email.
5. Any visitor without an account can browse the public feed in grid or map view, search by keyword, filter by category, barangay, and status, and view the full details of an approved report including its photo gallery.
6. No report submitted by a citizen is visible on the public feed until an administrator explicitly approves it.
7. A citizen who submits more than 5 reports within a 24-hour window is blocked from submitting additional reports until the window resets.

## Future Plan

### Vision

Bantay Kalsada grows from a Taytay-only app into a multi-municipality civic platform for the Province of Rizal: every municipality gets its own report feed and moderation dashboard, and a province-wide Rizal dashboard aggregates across all of them. Adoption is driven through social media promotion and direct outreach to LGUs.

### Deployment & Tenancy Model (Decision)

- **Single multi-tenant app** (one Next.js app, one Supabase database) — NOT one instance per municipality. A Rizal-wide dashboard requires unified data; N separate databases/instances make aggregation genuinely painful.
- Each municipality = a `municipality` dimension on `reports` + subdomain/path routing + scoped admin roles. The provincial dashboard is a scope-less query.

### Phased Roadmap

| Phase | Scope | Gate to advance |
| ----- | ----- | --------------- |
| 1. Prove Taytay (now) | Ship Taytay-scoped Public REST API; drive real users + consumers via socials | Sustained real usage: reports submitted, moderated <48h, resolved |
| 2. Retain in Taytay | Offline submission, geographic/barangay search, admin report editing, activity log/audit trail, report lifecycle timeline | Measurable repeat usage + a real (non-demo) moderation queue |
| 3. Pilot municipalities | Add `municipality` to `reports` (backfill Taytay); load all Rizal municipality polygons; rework `barangay` enum → per-municipality reference table; municipality-aware boundary enforcement; add `MUNICIPALITY_ADMIN` + `PROVINCE_ADMIN` roles; onboard 1–2 pilot municipalities (e.g. Binangonan/Angono/Cainta) | Pilot municipality actively moderating its own feed |
| 4. Province-wide | Onboard all 13 Rizal municipalities; provincial Rizal dashboard; then government integrations (DPWH/MMDA/LGU APIs) as a separate track | Funding/sustainability secured |

### Data-Model Seams for Multi-Municipality (cheap now, expensive later)

- `municipality_boundaries` is already a multi-row table — the key enabler, keep it that way.
- `reports.barangay` is a Taytay-only Postgres enum — will become a per-municipality reference table with `reports.barangay` as text/FK.
- Boundary enforcement (`is_within_boundary`, `trg_reports_location_boundary`) is Taytay-scoped — becomes municipality-aware.
- Public RLS read is unscoped — works for the province feed; per-municipality feeds scope by the future `municipality` column.
- `profiles` should be shaped so a future `municipality_id` column for scoped admins slots in cleanly.
- The Public REST API contract must stay additive: add `?municipality=` and a `municipality` response field later without breaking consumers; a `GET /api/municipalities` endpoint is a follow-up.

### Sustainability (Non-Code Constraint)

Free tiers are a proof-of-concept runway, not a province-scale foundation. Before Phase 4, secure a revenue path — LGU funding, a per-municipality SaaS tier, or a DPWH/LGU digitization grant — to cover: Vercel Pro (bandwidth/invocations, subdomain routing), Supabase paid tier (DB size), Cloudinary (province-wide photo volume), and PhilSMS (per-message SMS cost).

### Out of Scope Until These Decisions

- Multi-municipality deployment, region-scoped admin roles, and government-system integration are currently **Out of Scope** (see Scope section). Each becomes In Scope only via an explicit scope decision when its phase starts.


