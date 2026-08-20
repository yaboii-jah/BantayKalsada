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
- [x] App Feedback — Complete
- [x] Admin Note on Feedback — Complete
- [x] Dark Mode (User Side) — Complete
- [x] Bulk Admin Actions — Complete
- [x] Community Features (Severity Tagging) — Complete
- [x] Comments on Reports — Complete
- [x] Municipality Scope — Taytay, Rizal
- [x] Browse Map Heatmap (Phase A) — Markers/Heatmap toggle, severity-weighted density of all Taytay reports
- [x] Admin Trust Features (Tier 3) — admin report editing, activity log/audit trail, report lifecycle timeline, duplicate-report linking/merge
- [x] Observability (Tier 5) — Sentry error monitoring (server + edge + client) and Plausible first-party analytics

## Current Goal

- Offline submission (Mobile & Notifications v2.2) — complete and verified.
- Offline report editing + offline map preload (Offline Experience v2.3) — complete and verified.
- Offline upload UX + reliability (Offline Experience v2.4) — complete and verified.
- Offline connectivity detection + retained photos (Offline Experience v2.5) — complete and verified.
- Admin trust features (Tier 3) — complete and verified (see Completed section).
- Observability (Tier 5) — **decommissioned**: Sentry + Plausible fully removed from the app (deps, configs, instrumentation, analytics hooks, env vars, docs). See "Observability Removal" below.
- Security hardening — audit resolved (fixes 1–8 implemented + verified; see Completed section).
- Context/app alignment audit — completed (see "Context/App Alignment Audit" below).
- Mobile submit access + offline/auth session hardening — completed (see Completed section).
- Offline routes + OAuth session fix (Offline Experience v2.6) — complete and verified on the live deployment (see Completed section).
- Security hardening round 2 (2026-08-15 audit) — complete; see "Security Hardening (2026-08-15 Audit)" below.
- Security + standards audit (2026-08-18) — remediation complete (S3–S5, T1, T2, T4 + hygiene; S1/S2 recorded as reproducibility gap and baselined); see "Security + Standards Audit Remediation" below. Migrations `20260818000001`/`20260818000002` applied to the live DB and verified (2026-08-18, dashboard SQL Editor, no errors).
- Issues & suggestions batch (2026-08-19) — SMS reliability (surfaced warnings + rejection-reason truncation + parallelized bulk sends), admin filters (search/category/barangay) + newest-first pending, bulk-bar pagination clearance, notification-bell spinners, flag-owner notification, React #301 investigation; see "Issues & Suggestions Batch (2026-08-19)" below. Migration `20260819000001_add_notification_flagged_owner_type.sql` created — **apply in the Supabase SQL editor** (pending user).
- Admin palette refresh (2026-08-19) — admin-only deep blue-tinted near-black neutral scheme scoped to `body.admin-theme`; see "Admin Palette Refresh (2026-08-19)" below.

## Completed

### Admin Palette Refresh (2026-08-19)

- [x] **Admin-only dark scheme** — new `body.admin-theme` token override in `app/globals.css` re-declares the neutral palette as deep blue-tinted near-black (`--background oklch(0.16 0.015 262)`, `--card/--popover 0.20`, `--muted/--secondary/--accent 0.24`, `--border/--input 0.26`, `--sidebar 0.14`, brighter `--muted-foreground 0.75`). `--primary` (blue), `--status-*`, and `--destructive` unchanged — semantic colors stay consistent with the citizen side.
- [x] **Scoped to `<body>` so portals match** — new `components/admin/admin-theme.tsx` (client) adds/removes the `admin-theme` class on `document.body`; mounted in `app/admin/layout.tsx` (server layout, so the class only ever appears after the admin role guard passes). Custom properties cascade to Dialogs, `InlineSelect`, Sonner toasts, and Tooltips that portal to `document.body` — the whole admin panel is consistent. Cleanup on unmount ensures navigating admin → citizen removes the override.
- [x] Verified: `npx tsc --noEmit`, `npm run lint`, `npm run build` all pass. Manual check needed: walk all admin pages + rejection modal/InlineSelect/toast to confirm palette coverage and that the citizen side is unchanged.

### Issues & Suggestions Batch (2026-08-19)

Sourced from `current-issues-suggestions.md` (re-opened by the user). All implemented + verified: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run build` passes (32 routes, webpack, Next 16.3.1).

- [x] **SMS reliability (reject + bulk approve)** — root causes: (1) rejection reason was appended to the SMS untruncated (`lib/notifications.ts`) → ~600-char multipart message some gateways reject; (2) bulk actions awaited email+SMS **serially** per report (3 attempts × 1s retries each) → Vercel server-action timeouts killed remaining sends; (3) SMS skips (no phone/opt-in) and failures were logged server-side only — invisible to the admin. Fixes: `sendReportNotifications` (`lib/admin-notifications.tsx`) now returns `{ smsError?, smsSkipped? }` and fires push before the SMS branch; rejection reason sanitized/truncated to ~120 chars (collapse newlines/whitespace) in `getSmsMessageForType`; the 3 bulk actions (`bulkApproveReports`/`bulkRejectReports`/`bulkResolveReports`) collect notification promises and settle them in parallel via `Promise.allSettled` (`settleNotificationPromises`), then return `warnings`; `AdminActionResponse` gained `warnings?: string[]`; single approve/reject/resolve return `warnings` too. Warnings surfaced as `toast.warning` in `bulk-action-bar.tsx` and `action-buttons.tsx` ("SMS skipped — no phone/opt-in" / "SMS failed: …"). Delivery latency itself remains PhilSMS/carrier-side; parallelization removes the app-side serial delay.
- [x] **Bulk selection bar covers pagination** — `BulkActionBar` (`components/admin/bulk-action-bar.tsx`) was `fixed bottom-0 z-50` with a translucent `bg-background/60` backdrop, hiding the pagination numbers. Bar made fully opaque (`bg-background`); the 4 queue pages (`pending`/`approved`/`rejected`/`resolved`) wrapped in `pb-20` so pagination always scrolls clear of the bar.
- [x] **Admin lists latest-first + filters** — Pending queue flipped to newest-first (`pending/page.tsx` `ascending: false`; approved/rejected/resolved were already newest-first). New `components/admin/report-filter-bar.tsx` (client): title search + category + barangay dropdowns driven by URL `searchParams` (`q`/`category`/`barangay`); filters applied to **both** the count and data queries on all 4 queue pages and preserved in pagination hrefs via `lib/admin-report-filters.ts` (`parseReportFilterParams` validates against the DB enums, `buildAdminListHref`, `hasReportFilters`). Also added the missing `BROKEN_TRAFFIC_SIGN` category to the filter bar and `admin-queue-table.tsx` category labels (previously displayed as the raw enum value). Empty state distinguishes "no results match filters" from "list empty".
- [x] **Notification-bell spinners** — `components/notification-bell.tsx`: per-item `Loader2` while marking-as-read/deleting (tracked via `pendingIds`), "Clearing…" + disabled state on Clear all (previously no pending state at all), delete button shows a spinner instead of the X while pending.
- [x] **Flag notifies the report owner too** — new `REPORT_FLAGGED_OWNER` notification type. Migration `20260819000001_add_notification_flagged_owner_type.sql` (`ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'REPORT_FLAGGED_OWNER'`, non-transactional). `types/database.types.ts` updated (both the `Enums` union and the schema array). `lib/notifications.ts` union + `getMessageForType` ("Your report "X" was flagged and is under admin review.") + `getSubjectForType`. `flagReport` (`app/actions.ts`) now also notifies `report.submitted_by_id` in-app. `notification-bell.tsx`: Flag icon, yellow tint, routes to `/my-reports/[report_id]` (admins still get `REPORT_FLAGGED` → `/admin/reports/[report_id]`). In-app only, like the admin flag alert. **Pending user:** apply migration in the Supabase SQL editor.
- [x] **React #301 on `/admin/feedback/[id]` (fixed)** — "Too many re-renders" was a render-phase `setState` loop in `components/admin/feedback-note-editor.tsx`, **introduced by commit `b611670`** (ESLint cleanup replaced the safe `useEffect` prop-sync with a render-phase pattern). The guard `if (initialNote !== prevNote)` compared the raw `initialNote` (`null` when no admin note) against `prevNote`, which is always a string (`?? ""`), so with `admin_note = null` the guard was true on **every** render → `setState` during render → infinite loop. (Earlier "stale PWA chunk" attribution was wrong.) Fix: guard now compares the normalized value (`const normalizedNote = initialNote ?? ""; if (normalizedNote !== prevNote)`) and terminates in all cases; verified with `npx tsc --noEmit`, `npm run lint`, `npm run build`.

### Context/App Alignment Audit

- [x] Audited all context files against the actual codebase (routes, components, lib, API routes, migrations, configs, server actions, deps). Found and fixed 4 discrepancies.
- [x] **`report_category` enum** — `context/data-model.md` enum block was missing `BROKEN_TRAFFIC_SIGN` (DB enum + `reportCategoryEnum` have 6 values). Added it plus a note: it's a valid submission category (form + admin edit form) but **deliberately excluded** from the browse filter, browse-map labels, and `/guidelines` list (those surface 5 primary categories).
- [x] **`context/project-overview.md` category wording** — "Five predefined report categories" reworded to document the 6-value enum with Broken Traffic Sign intentionally absent from browse filtering; the Public Feed filter bullet notes the same.
- [x] **`.env.example` created** — sourced from every `process.env.*` usage in the codebase (`lib/`, `app/api/`, configs, instrumentation, proxy): Supabase (URL/anon/service-role), Cloudinary (cloud name/api key/secret; upload preset is hardcoded as `bantay-kalsada` in `lib/cloudinary.ts` — no env var), Brevo (API key + sender email), PhilSMS (base/token/sender id), TomTom API key, VAPID keys + subject, `API_RATE_LIMIT_SECRET`, `NEXT_PUBLIC_SITE_URL`, and optional Sentry (DSN/org/project/auth token) + Plausible (`NEXT_PUBLIC_PLAUSIBLE_SRC`). Optional vars documented as omit-to-disable.
- [x] **Stale `middleware.ts` references** — `context/architecture.md` ("session refresh helper called in `middleware.ts`" → `proxy.ts`) and `context/code-standards.md` (Next.js 16 `proxy.ts` replaces `middleware.ts`) corrected.
- [x] Docs only — no application code changed; `npx tsc --noEmit` and `npm run lint` unaffected.

### Auth Session Persistence (from current-issues-suggestions.md)

- [x] **Verified: users already stay signed in across browser/tab closes.** `lib/supabase/client.ts` uses `@supabase/ssr` defaults (`persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`) — session persisted in `localStorage` (`sb-<project-ref>-auth-token`) + mirrored into access/refresh cookies for server reads. `proxy.ts` → `lib/supabase/middleware.ts` `updateSession()` refreshes on every request. No code change needed.
- [x] **1-week inactivity goal depends on hosted Supabase project settings (not in repo).** Dashboard checklist — Supabase → Authentication → Configuration: (1) **Refresh token lifetime** — default 60 days rolling, must be ≥ 7 days; (2) **Session duration / timebox** — must be ≥ 7 days; (3) **JWT expiry** — default 1h, does NOT need raising (auto-refresh covers return). No `supabase/config.toml` exists; auth settings live on the dashboard.
- [ ] Pending: user to confirm dashboard values ≥ 7 days; log result here.

### UI/UX Batch (from current-issues-suggestions.md)

- [x] **Browse map clustering** — wrapped flat markers in `<MarkerClusterGroup chunkedLoading>` (`components/browse/browse-map.tsx`); imported `leaflet.markercluster` CSS. `react-leaflet-cluster` + `leaflet.markercluster` were already installed but unused (removed in commit `2f58ad9`). Docs (`architecture.md`, `feature-specs/10`, `13`) now match code again.
- [x] **Compact mobile popup** — popup reduced to `maxWidth={200}` `minWidth={160}`; layout switched from tall vertical to compact horizontal card (56px thumb left, truncated title + category/status badges + View details right).
- [x] **Submit Report button in nav** — primary CTA added to `navLinks` fragment in `components/public-nav.tsx` (renders in both desktop nav and mobile Sheet); `/submit` already redirects guests through `/login?redirect=/submit` via `proxy.ts`.
- [x] **Back button on Account Settings** — `<BackButton fallbackHref="/browse" />` added to `app/(citizen)/account/page.tsx`, matching my-reports/feedback pattern.
- [x] **Install banner persists dismissal** — `components/install-prompt.tsx` now stores dismissal in `localStorage` (`bk-install-prompt-dismissed`); already hidden when `display-mode: standalone` and on `appinstalled`.
- [x] **Offline submit modal** — `components/reports/report-form.tsx` opens a dimmed dialog (`bg-black/60` overlay via new `overlayClassName` prop on `DialogContent` in `components/ui/dialog.tsx`) with a CheckCircle icon, "Report saved offline" message, and OK button, in both offline queue paths (network-error catch + explicit offline submit). Success toast replaced by modal.
- [x] **Offline route precaching** — `app/sw.ts` adds `/`, `/submit`, `/browse`, `/my-reports`, `/my-feedback`, `/account`, `/feedback` to `precacheEntries` so they're navigable offline without a prior online visit (HTML cached at SW install; app JS/CSS already fully precached). Also enabled `navigationPreload: true` (was `false`, stale vs `feature-specs/17-pwa-support.md`).
- [ ] Verification: `npx tsc --noEmit` + `npm run lint` + production build (needs `npm install` — this checkout has no `node_modules`).

### Mobile Submit Access + Offline/Auth Session Hardening

- [x] **Mobile submit = plus icon** — `components/public-nav.tsx`: added a ghost icon Button (`Plus`, `aria-label="Submit report"`) linking to `/submit` in the mobile top bar beside the notification bell (always visible; guests redirected by `proxy.ts` to `/login?redirect=/submit`). The full-text "Submit report" button stays in the desktop nav only via `hidden sm:inline-flex` (removed from the mobile Sheet). Kept the prior uncommitted reorder making it the first nav item.
- [x] **`lib/auth/session-user.ts` helper** — client-side `getSessionUser(supabase)`: reads `getSession()` first (instant, from the persisted cookies, no network while the access token is valid), falls back to `getUser()` (refreshes the token online), wrapped in try/catch so a transient/offline network error never blanks the session.
- [x] **Applied helper** to client auth reads: `components/public-nav.tsx` (boot user load), `components/reports/report-form.tsx` `queueOfflineReport`, `components/offline/offline-queue-processor.tsx`, `components/offline/offline-reports-panel.tsx`. All server-side `getUser()` unchanged (`proxy.ts`, `lib/supabase/server.ts`, layouts, actions).
- [x] **Offline routes** — `public/sw.js` is a tracked stale build artifact; Vercel's own build regenerates it from `app/sw.ts` (OFFLINE_ROUTES + `navigationPreload: true`) on deploy, so no local build. **Requirement:** after deploy, load the app once online so the new service worker installs and precaches the offline routes; then offline navigation + queued submission works (enabled by the `getSessionUser` hardening above).
- [x] Verification — `npx tsc --noEmit` clean, `npm run lint` clean.

### Offline Routes + OAuth Session Fix (Offline Experience v2.6)

- [x] **OAuth (Google) session persistence** — `app/auth/callback/route.ts`: `setAll` now captures `cookiesToSet` (with `options`), and the OAuth redirect response applies those `options` (400-day lifetime). Previously cookies were copied without options → session cookies wiped on browser close (Google sign-in only; email/password already set 400-day cookies client-side). Pattern matches `lib/supabase/middleware.ts`.
- [x] **Stop precaching auth pages** — `app/sw.ts` `OFFLINE_ROUTES` trimmed to public-only (`/`, `/browse`, `/offline`). The old list precached `/submit`, `/my-reports`, `/my-feedback`, `/account`, `/feedback` at SW install — a logged-out/fresh install cached the **login-redirect HTML under `/submit`** (offline submit → `/login`), an **empty shell under `/account`** (`page.tsx` returns `null` when logged out), and a **guest-visible `/feedback`** (no auth gate).
- [x] **Offline navigation fallback** — `app/sw.ts` adds Serwist `fallbacks.entries: [{ url: "/offline", matcher: ({ request }) => request.mode === "navigate" }]` so any failed offline navigation serves `/offline` (precached, static, noindex) — including `/submit`, `/account`, `/feedback`, `/my-reports`, `/my-feedback`.
- [x] **`/offline` page** — new `app/(public)/offline/page.tsx` (server component, `robots: { index: false, follow: false }`) + `components/offline/offline-page.tsx` (client): online-aware banner ("You're offline" / "You're back online" via `useOnline`) + embedded `<ReportForm />` so offline submission still queues (photo blobs + already-uploaded URLs) and drains via `OfflineQueueProcessor` on the next online citizen visit.
- [x] **Stale navigation-cache cleanup** — `app/sw.ts` adds an `activate` listener deleting navigation caches (`pages`, `pages-rsc`, `pages-rsc-prefetch`, `next-data`, `others`; suffix-matched) so an old cached login/empty page can't be served after a deploy; precache + tile caches untouched.
- [x] **`/account` + `/feedback` protected online** — added to `proxy.ts` `protectedRoutes` (guests redirected to `/login?redirect=...`). Fixes the empty `/account` page for guests; `/feedback` previously had no auth gate. Nav already exposes the Feedback link only to logged-in users.
- [x] Verification — `npx tsc --noEmit` clean, `npm run lint` clean.
- [x] Live verification on `https://bantay-kalsada-sooty.vercel.app` — deployed `public/sw.js` contains `fallbacks.entries [{ url: "/offline", matcher: navigate }]`, `navigationPreload: true`, the activate-time navigation-cache cleanup, and a precache of `/`, `/browse`, `/offline` only (protected routes appear only as `/_next/static/chunks/...` JS assets, never as route HTML); no Sentry prelude; `/offline` page renders HTTP 200. Offline submit in incognito works (offline page + queued submission, no `/login` redirect); Google sign-in persists across browser close — user-confirmed.

### Observability Removal (Sentry + Plausible decommissioned)

- [x] **Deps removed** — `npm uninstall @sentry/nextjs next-plausible` (package.json + package-lock.json cleaned).
- [x] **Files deleted** — `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts`, `instrumentation-client.ts`, `lib/analytics.ts`, and the stale tracked `public/sw.js` build artifact (it carried a `_sentryDebugIds` prelude; `withSerwist` regenerates `public/sw.js` on every production build, and dev has Serwist disabled). `context/feature-specs/31-observability.md` deleted.
- [x] **Config reverted** — `next.config.ts` drops the `withSentryConfig` wrapper (keeps `withSerwist`); `app/layout.tsx` drops `PlausibleProvider` + `NEXT_PUBLIC_PLAUSIBLE_SRC` gating (renders `{children}` directly); `app/global-error.tsx` drops the Sentry import/`captureException` (error UI kept).
- [x] **Analytics hooks stripped** — removed `useAnalytics()`/`track(...)` from `components/reports/report-form.tsx`, `components/offline/offline-queue-processor.tsx`, `components/reports/share-button.tsx`, `components/reports/flag-report-buttons.tsx`, `components/reports/comment-form.tsx`, `components/reports/feedback-form.tsx`, `components/admin/action-buttons.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx` (incl. `track` from all dependency arrays).
- [x] **`.env.example`** — Sentry + Plausible blocks removed (no more `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`, `NEXT_PUBLIC_PLAUSIBLE_SRC`).
- [x] **Docs updated** — `architecture.md` (tech table rows, `sentry.*`/`analytics.ts` bullets, invariants 27–28 removed, rest renumbered), `project-overview.md` (Observability line removed), `app-codebase-context.md` (intro, Observability Data Flow section, file-org entries removed). Admin dashboard analytics (recharts from Supabase data) is untouched — it is not Plausible.
- [x] Verification — `npx tsc --noEmit` clean, `npm run lint` clean, repo grep for `sentry|plausible|useAnalytics|next-plausible` (excl. node_modules/.git/.agents) zero hits.

### Security Hardening (2026-08-15 Audit)

- [x] Full security audit round 2 — dependencies, RLS policies, server actions, API routes, email/SMS/push, CSV export. 5 high + 6 medium + 8 low findings documented (prior round covered fixes 1–8).
- [x] **Migration `20260815000001_harden_rls.sql`** — (1) `reports` citizen UPDATE policy: `WITH CHECK` now requires `status = 'PENDING'` (fixes **self-approval/self-reject/self-resolve** of own pending report via PostgREST — previously `WITH CHECK` only checked `auth.uid() = submitted_by_id`); (2) `municipality_boundaries`: RLS enabled + `REVOKE ALL FROM anon, authenticated` (fixes writable boundary polygon → geo-scope bypass / submit-flow DoS); (3) `profiles`: `REVOKE UPDATE` + column-level `GRANT UPDATE (phone, sms_notifications, full_name)` (fixes potential `role='ADMIN'` self-promotion via the column-unrestricted documented UPDATE policy); (4) `report_comments` UPDATE policy: requires `status='ACTIVE'` on both USING/WITH CHECK + target report `APPROVED/RESOLVED` (blocks re-publishing admin-removed comments + cross-report moves); (5) `report_flags` INSERT/UPDATE policies: require target report `APPROVED/RESOLVED`. **Not yet applied to remote** — needs `supabase db push` or the user to run it (pending dashboard verifications below).
- [x] **Dependencies** — `next` 16.2.6 → **16.3.1** (+ `eslint-config-next` 16.3.1): resolves high-severity Next advisories (Server Actions DoS/unbounded payload, middleware/proxy bypass, SSRF, cache confusion) plus `sharp`/`postcss` transitives; then `npm audit fix` cleared all remaining transitives (hono, @hono/node-server, js-yaml, ip-address, brace-expansion, fast-uri, body-parser — all dev-tooling via shadcn CLI MCP SDK / eslint / serwist). **`npm audit` now reports 0 vulnerabilities.**
- [x] **CSV formula injection (High)** — `lib/csv.ts` `escape()` now prefixes cells starting with `= + - @ \t \r` with `'` (admin export no longer executes formulas in Excel/Sheets).
- [x] **Email HTML injection (Med)** — `emails/render.ts`: added `escapeHtml()` applied to every user/admin-controlled interpolation (citizenName, reportTitle, rejectionReason, resolutionNotes, adminNote, feedbackTitle) + button href/label.
- [x] **Rate-limit IP spoofing (Med)** — `lib/api-rate-limit.ts` `clientIp()` now prefers `x-real-ip` (trusted-proxy set) over the last `x-forwarded-for` hop; `enforceApiRateLimit` accepts per-caller `{ hourly, daily }` limits.
- [x] **Tile proxy abuse (Med)** — `app/api/traffic/tiles/[...]`: per-IP rate limit (7200/h, 50k/d), `AbortSignal.timeout(10s)`, 504 on upstream failure, `Cache-Control: public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400` (edge + browser caching reduces paid TomTom quota burn).
- [x] **Cloudinary sign CSRF (Med)** — `app/api/uploads/sign/route.ts` `GET` → **`POST`** + same-origin check (Origin host must match request host or `NEXT_PUBLIC_SITE_URL`); client caller `lib/cloudinary-upload.ts` updated. Cross-site `<img>` can no longer burn a victim's 30/h quota.
- [x] **`sms/diagnose` de-leak (Med)** — `app/api/sms/diagnose/route.ts`: removed token preview + length math and full `/me`/`/balance` response bodies (now status/ok only), added 30/h IP rate limit, generic 500 error (no raw `err.message`).
- [x] **Duplicate-search wildcard injection (Med)** — `app/admin/actions.ts` `findDuplicateCandidates` reuses `sanitizeSearchTerm` on the title query.
- [x] **Admin id validation (Low)** — `z.string().uuid()` added to `editReport`, `findDuplicateCandidates`, `linkDuplicate`, `unlinkDuplicate`, `mergeReports`, `removeComment`; `removeComment` now 404s when the comment doesn't exist (previously silent success).
- [x] **Low items** — push-subscription schema (`lib/validations/push.ts`: endpoint restricted to known push-service hosts — fcm.googleapis.com, Mozilla autopush, Apple, WNS — plus keys shape) applied in `savePushSubscription`; `resolvedImageUrls` restricted to `https://res.cloudinary.com/` URLs; `addComment` `parent_id` validated (uuid + same report + ACTIVE); `createOfflineSubmitFailedNotification` input caps (queueId ≤ 40, title ≤ 100); SMS-failure logs mask the recipient phone (`lib/admin-notifications.tsx`).
- [x] Verification — `npx tsc --noEmit` clean, `npm run lint` clean (3 pre-existing warnings), `npm run build` passes on Next 16.3.1 (webpack, 32 routes, serwist SW bundled), `npm audit` = 0 vulns.
- [x] **Migration applied to remote** — `20260815000001_harden_rls.sql` run in the Supabase SQL Editor on `gvhyajfarhdbmgkloeit`, no errors; verification query confirmed the hardened `WITH CHECK` policies (reports `status='PENDING'`, comments/flags `EXISTS` public-report guards), `profiles` column grants (`can_update` true only for `phone`/`sms_notifications`/`full_name`), and `municipality_boundaries.relrowsecurity = t`.
- [x] **Dashboard verifications complete** — `notifications` `"Citizens can read own notifications"` + `"Citizens can update own notifications"` policies confirmed present in the live DB (mark-as-read path intact); `profiles` column exposure closed by the migration's grants; Cloudinary upload preset `bantay-kalsada` confirmed to restrict `resource_type` to images with size/format limits.

### Security + Standards Audit Remediation (2026-08-18)

Full standards + security audit (feature spec `32-security-audit.md`). Findings re-verified against the live DB and codebase; false positives corrected before fixing. Verified via `npx tsc --noEmit` (clean), `npm run lint` (clean), `npm run build` (passes, 32 routes).

- [x] **S1/S2 — profiles/notifications RLS: NOT live bugs, reproducibility gap.** Live DB confirmed to have RLS enabled with the documented owner policies (user-verified via dashboard + prior verification log above). Finding recorded as: base schema + those policies exist in **no migration**. Fixed by baseline migration `20260818000002_baseline_profiles_notifications_rls.sql` (idempotent — `CREATE TABLE IF NOT EXISTS`, `DO`-block enum creation for `user_role`/`report_category`/`report_status`/`notification_type`, `CREATE OR REPLACE FUNCTION` + `DROP TRIGGER IF EXISTS` for `handle_new_user`/`set_updated_at`, `DROP POLICY IF EXISTS` + recreate for the 5 owner policies). Deliberate exclusions: `report_within_taytay_check` (references `location` from `20250713000002`) and all columns added by later migrations are NOT recreated, so incremental migrations still replay cleanly.
- [x] **S3 — flag rate-limit bypass (real)** — `flagReport` counted live `report_flags` rows, so flag→unflag→re-flag evaded the 30/24h cap. New table `report_flag_actions` (migration `20260818000001_create_report_flag_actions.sql`: `user_id`, `report_id`, `action` `FLAGGED`/`UNFLAGGED`, `created_at`, index `(user_id, created_at DESC)`, RLS on/no policies). `flagReport` in `app/actions.ts` now counts **actions** via the service-role client; action rows written best-effort in try/catch (logging never blocks the user's flag toggle).
- [x] **S4 — bulk reject unbounded reason (real)** — `bulkRejectSchema.rejectionReason` in `lib/validations/bulk.ts` gained `.max(500)` (mirrors `rejectReportSchema`).
- [x] **S5 — feedback photo URL validation (real)** — `createFeedbackSchema.photo_urls` in `lib/validations/feedback.ts` now restricts items to `https://res.cloudinary.com/` via regex (matches `createReportSchema`).
- [x] **T1 — validation ordering (real)** — `submitReport`, `submitFeedback`, `addComment` in `app/actions.ts` now Zod-parse before any DB query / RPC call.
- [x] **T2 — comment actions used inline validation (real)** — new `lib/validations/comment.ts` (`addCommentSchema`, `editCommentSchema`, `deleteCommentSchema`); `addComment`/`editComment`/`deleteComment` now use them; unused `z` import removed from `app/actions.ts`.
- [x] **T4 — admin flags/duplicate UI type-safety** — `app/admin/flags/page.tsx`: removed inline `statusStyles`, uses shared `ReportStatusBadge`; rows filtered type-safely (non-null assertions removed). `components/admin/duplicate-manager.tsx`: replaced `statusLabels`/`statusStyles` with `ReportStatusBadge`; `DuplicateCandidate.status` retyped to `Database["public"]["Enums"]["report_status"]`.
- [x] **Hygiene** — `app/(auth)/reset-password/page.tsx`: `window.location.href = "/browse"` → `router.push("/browse")` (removes the only lint warning); `public/sw.js` (Serwist build artifact) added to `.gitignore`; `context/architecture.md` `/admin` access-control claim corrected (role gate is `app/admin/layout.tsx` + `verifyAdmin()` in every action — the proxy only checks authentication, it never reads the profile).
- [x] **Docs** — `data-model.md`: `report_flag_actions` table section + baseline-provenance note on the enum/tables intro; `app-codebase-context.md` F2 flag-spam note updated to the actions-counting design; `architecture.md` fixed; this tracker; spec `32` updated.
- [x] **Migrations applied to live DB** — `20260818000001` + `20260818000002` run in the dashboard SQL Editor on `gvhyajfarhdbmgkloeit` (2026-08-18), no errors. Verified: `report_flag_actions` table/RLS/index present, `count(*) = 0`; baseline enums/triggers/owner policies confirmed present exactly once. `types/database.types.ts` was hand-edited for `report_flag_actions` — re-run `supabase gen types` when the CLI is installed to confirm parity (optional).
- [ ] **Deferred (flagged, not auto-fixed)** — T3 `as unknown as` casts (behavioral risk; needs per-site typed validation), T5 oversized modules (`app/admin/actions.ts` 1140 lines, `app/actions.ts` 868), T6 hardcoded hex/token drift (`globals.css` vs `ui-context.md`).

### Security Hardening (Audit Fixes)

- [x] Full security audit of the codebase completed — 9 findings documented (auth callback open redirect, flag/SMS spam vectors, XFF spoofing, PostgREST filter injection, tile proxy abuse, unbounded rejection reason, arbitrary photo URLs, unverifiable RLS spot-check). User approved fixes 1–6.
- [x] **Fix 1 (High, open redirect)** — `app/auth/callback/route.ts`: added `safeNextPath()` that rejects non-relative / `//` / backslash-containing `next` values, falling back to `/browse` for the post-OAuth redirect
- [x] **Fix 2 (Medium, flag spam → admin notification flooding)** — `app/actions.ts` `flagReport`: 24h sliding window counting `report_flags` rows for the current user (anon-key server client; RLS owner SELECT applies), blocks at `>= 30` actions with a friendly message; check runs before the report fetch
- [x] **Fix 3 (Medium, paid SMS abuse)** — migration `supabase/migrations/20260811000001_add_test_sms_log.sql` (table `test_sms_log(id, user_id FK→auth.users ON DELETE CASCADE, created_at)`, RLS enabled with no policies — service-role only path, index `(user_id, created_at)`); applied to linked project `gvhyajfarhdbmgkloeit`, table verified; `types/database.types.ts` regenerated (incl. `test_sms_log`); `sendTestSms` now counts `test_sms_log` rows in the last 24h via `createAdminClient()` and blocks at 5/day, inserting a row only after a successful send
- [x] **Fix 4 (Medium, rate-limit bypass via XFF spoofing)** — `lib/api-rate-limit.ts` `clientIp()`: switched from first to **last** `x-forwarded-for` hop (the one appended by the trusted proxy), `x-real-ip` fallback unchanged (removed `request.ip` — not on `NextRequest` in this Next version, caught by typecheck)
- [x] **Fix 5 (Low-Med, PostgREST filter injection in /browse)** — exported `sanitizeSearchTerm` from `lib/api-reports.ts` and applied it to the `q` param in `app/(public)/browse/page.tsx` before building the `.or("title.ilike.%,description.ilike.%")` filter (strips `% _ , . ( )`)
- [x] **Fix 6 (Low, TomTom tile proxy abuse)** — `app/api/traffic/tiles/[z]/[x]/[y]/route.ts`: validates z ∈ 0–20 (integer), x/y integers within `0..2^z-1`, returns 400 for invalid tiles
- [x] **Fix 7 (Low)** — `lib/validations/report.ts` `rejectReportSchema.rejectionReason`: added `.max(500)`
- [x] **Fix 8 (Low)** — `lib/validations/report.ts` `createReportSchema.photo_urls`: restricted to `https://res.cloudinary.com/` URLs via regex (consistent with the signed Cloudinary upload flow in `app/api/uploads/sign/route.ts`)
- [x] Verification — `npx tsc --noEmit` clean (caught the `request.ip` type error), `npm run lint` clean
- [x] Feature spec `context/feature-specs/32-security-audit.md` written (9 findings, 8 fixed; finding 9 RLS spot-check recorded as manual-only)
- [x] Context updated — `data-model.md` (`test_sms_log` table/relationships/indexes/RLS/business rules), `architecture.md` (boundary notes, storage model, invariants 29–31), `code-standards.md` (rate-limit list, filter-sanitization + redirect rules), `app-codebase-context.md` (file-org annotations + Security Hardening subsection), `project-overview.md` (In Scope rate limiting + hardening), this tracker
- [x] This tracker updated

### Observability (Tier 5)

> **Superseded:** Sentry + Plausible were fully decommissioned — see "Observability Removal (Sentry + Plausible decommissioned)" above. This log documents the original (now-removed) implementation.

- [x] Installed `@sentry/nextjs@10.70.0` + `next-plausible@4.0.0` (no other new deps; builds use `--webpack` so no Turbopack Sentry conflict)
- [x] `sentry.server.config.ts` — Node SDK init (`Sentry.init`), DSN-guarded (`dsn = process.env.NEXT_PUBLIC_SENTRY_DSN`, `if (dsn)`), `environment: process.env.NODE_ENV`, no `tracesSampleRate` (errors only)
- [x] `sentry.edge.config.ts` — Edge SDK init for edge runtime/`proxy.ts`, same DSN guard
- [x] `instrumentation.ts` (project root) — `register()` imports the correct config by `process.env.NEXT_RUNTIME`; `export const onRequestError = Sentry.captureRequestError;` (verified against installed SDK — the `captureRequestError` signature `(error, request, errorContext)` matches `onRequestError` without wrapper)
- [x] `instrumentation-client.ts` — client SDK init (injected into the browser bundle by `withSentryConfig`), DSN-guarded
- [x] `app/global-error.tsx` — last-resort root error boundary with its own `<html className="dark h-full antialiased">`/`<body>` (project had none), styled with tokens matching browse `error.tsx` (destructive icon, `bg-background`, `text-foreground`/`muted-foreground`, retry button), `Sentry.captureException(error)` in `useEffect` guarded by DSN
- [x] `next.config.ts` — wrapped with `withSentryConfig(withSerwist(...)(nextConfig), {...})`; options `org`/`project`/`authToken` from env, `silent: true`, `suppressOnRouterTransitionStartWarning: true`, `webpack.treeshake: { removeTracing: true, removeDebugLogging: true }` (so no `onRouterTransitionStart` export needed); source-map upload skipped cleanly when `SENTRY_AUTH_TOKEN` absent
- [x] No tunnel → no `proxy.ts` matcher changes (Sentry ingest stays external)
- [x] `lib/analytics.ts` — `"use client"`; `AnalyticsEvents` type map + `useAnalytics()` → `usePlausible<AnalyticsEvents>()`; props-bearing events require `{ props: { ... } }`
- [x] `app/layout.tsx` — `const plausibleSrc = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC;` conditional `<PlausibleProvider src={plausibleSrc}>` (provider throws on falsy `src`, so it renders children raw when unset); wraps `{children}` inside `TooltipProvider`
- [x] Events wired (all via `useAnalytics()` `track`):
  - `components/reports/report-form.tsx` — `Report Submitted` (props severity + category) on successful `onSubmit`; `Report Queued Offline` in `queueOfflineReport`; deps updated (queueOfflineReport `[pendingFiles, track]`, onSubmit `[router, isEdit, reportId, pendingFiles, queueOfflineReport, clearForm, track]`)
  - `components/offline/offline-queue-processor.tsx` — `Offline Report Submitted` on successful queued submit; deps `[router, track]`
  - `components/reports/share-button.tsx` — `Report Shared`
  - `components/reports/flag-report-buttons.tsx` — `Report Flagged` (props flagType)
  - `components/reports/comment-form.tsx` — `Comment Added`
  - `components/reports/feedback-form.tsx` — `Feedback Submitted` (props type)
  - `app/(auth)/register/page.tsx` — `Signup`; `app/(auth)/login/page.tsx` — `Login`
  - `components/admin/action-buttons.tsx` — three separate components (ActionButtons/handleApprove, ResolveButton, RejectButton) each with its own `track` call: `Report Approved`, `Report Resolved`, `Report Rejected`
- [x] `.env.example` — added `NEXT_PUBLIC_SENTRY_DSN` (public, build-time; used for runtime init), `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN` (build-time only, source maps), `NEXT_PUBLIC_PLAUSIBLE_SRC` (public, build-time; provider not rendered when unset). `.env.local` stays gitignored
- [x] Verification: `npx tsc --noEmit` clean; `npm run lint` clean (fixed one `react-hooks/exhaustive-deps` by adding `track` to report-form onSubmit deps); `npm run build` passes (~87s compile, webpack, TS 13.7s, 31 routes, `(serwist) Bundling the service worker script`, `ƒ Proxy (Middleware)`) — all with env vars absent
- [x] Feature spec `context/feature-specs/31-observability.md` written
- [x] Context updated — `project-overview.md` (In Scope), `architecture.md` (stack rows, boundaries, invariants 27–28), `app-codebase-context.md` (intro + observability data flow + file org), this tracker

### Admin Trust Features (Tier 3)

- [x] Migration `20260809000001_create_report_activity_log.sql` — `report_activity_action` enum (SUBMITTED, EDITED, APPROVED, REJECTED, RESOLVED, DUPLICATE_LINKED, MERGED, COMMENT_REMOVED) + `report_activity_log(id, report_id FK→reports ON DELETE CASCADE, actor_id FK→auth.users ON DELETE SET NULL, action, detail jsonb, created_at)`; RLS enabled with no policies (service-role only); index `(report_id, created_at)`
- [x] Migration `20260809000002_add_report_duplicate_of.sql` — `reports.duplicate_of_id uuid NULL REFERENCES reports(id) ON DELETE SET NULL` + index (duplicates retired by pointer, never hard-deleted)
- [x] Migration `20260809000003_add_report_edited_notification.sql` — `ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'REPORT_EDITED'` (non-transactional)
- [x] All three migrations applied to remote via `supabase db query --linked`; enum value + types verified; `types/database.types.ts` regenerated via `supabase gen types typescript --linked` (file re-encoded UTF-16 → UTF-8)
- [x] `lib/report-activity.ts` — `logReportActivity({ reportId, actorId, action, detail? })` via service-role client; `detail` cast to `Json`
- [x] Audit wiring `app/actions.ts` — `submitReport` → `SUBMITTED`; `updateReport` → `EDITED` with `detail.changedFields` (select extended to all editable fields)
- [x] Audit wiring `app/admin/actions.ts` — `approveReport`/`rejectReport`/`resolveReport` + bulk variants → `APPROVED`/`REJECTED` (`detail.reason`)/`RESOLVED` (`detail.notes`); `removeComment` → `COMMENT_REMOVED` (now fetches `report_id` first, checks `auth.user`)
- [x] Admin report editing — `editReport(reportId, CreateReportInput)` Server Action (boundary re-check `is_within_boundary` only when lat/lng changed; logs `EDITED`; in-app `REPORT_EDITED` notification to submitter, no email/SMS); page `app/admin/reports/[id]/edit/page.tsx` + `components/admin/admin-report-edit-form.tsx` (RHF + zod, reuses PhotoUpload/LocationPickerWrapper/InlineSelect); "Edit report" button on admin review page
- [x] Duplicate management — `linkDuplicate` (guards self-link + canonical-not-itself-duplicate), `unlinkDuplicate` (clears pointer, logs `DUPLICATE_LINKED` w/ `{ canonicalId: null, unlinked: true }`), `mergeReports` (reassigns comments + flags, dedups photos capped at 3, retires duplicate via `duplicate_of_id`, logs `MERGED` on both), `findDuplicateCandidates` (get_nearby_reports 1500 m + title ilike ≥3 chars; excludes self and already-linked); UI `components/admin/duplicate-manager.tsx` on admin review page
- [x] Lifecycle timeline — `components/reports/report-timeline.tsx` (server component; reads `report_activity_log` via admin client, falls back to report timestamps for legacy reports, actor names from profiles); rendered on admin review page + citizen `my-reports/[id]`
- [x] Duplicate banner — `components/reports/duplicate-banner.tsx` (props `duplicateOfId`, `href`) on admin, citizen, and public `reports/[id]` detail pages
- [x] Notifications — `lib/notifications.ts` `EditedNotificationType` ("An administrator updated the details of your report...", subject "Report Updated by Admin — Bantay Kalsada"); `components/notification-bell.tsx` `PenLine` icon + `NOTIFICATION_ICONS` entry (href falls through to default `/my-reports/[report_id]`)
- [x] Mock data — mock reports include `duplicate_of_id: null`
- [x] Type fixes surfaced by typed admin client — added `BROKEN_TRAFFIC_SIGN` to `reportCategoryEnum` + all category label maps; admin edit passes `barangay: report.barangay ?? "DOLORES"` (DB nullable vs schema required); timeline `unknown` ReactNode type-guards; `Json` cast in report-activity
- [x] `npx tsc --noEmit` clean; `npm run build` passes with zero errors (verified clean HEAD via git stash — all errors were from the new work)
- [x] Feature spec `context/feature-specs/30-admin-trust.md` written
- [x] Context updated — `project-overview.md` (In Scope), `architecture.md` (boundaries, storage model, invariants 22–26), `data-model.md` (enums, tables, relationships, indexes, RLS, business rules), `app-codebase-context.md`, this tracker

### Admin Report UI Polish

- [x] **Unified admin action bar** — `app/admin/reports/[id]/admin-report-actions.tsx` now always renders (no longer null for REJECTED/RESOLVED) and owns the whole action bar: DuplicateManager (left, via `className="mr-auto"`), "Edit report" link (`buttonVariants` outline `size="lg"`), and status ActionButtons in one `flex flex-wrap items-center justify-end gap-3 border-t border-border pt-6` container. `components/admin/duplicate-manager.tsx` gained a `className` prop (merged via `cn`) + `size="lg"` triggers; `app/admin/reports/[id]/page.tsx` no longer renders standalone DuplicateManager/Edit blocks, passes `duplicateOfId={report.duplicate_of_id}`.
- [x] **Edit page matched to /submit** — `app/admin/reports/[id]/edit/page.tsx` flattened to `mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8` with submit-style heading (`mb-2 text-2xl font-bold tracking-tight text-foreground`) + subtitle (`mb-8 text-sm text-muted-foreground`); form renders flat (no card container), back button kept.
- [x] **Admin loading skeletons** — `app/admin/approved/loading.tsx`, `app/admin/rejected/loading.tsx`, `app/admin/resolved/loading.tsx`, `app/admin/flags/loading.tsx` (title + rows), and `app/admin/reports/[id]/edit/loading.tsx` (flat max-w-2xl skeleton mirroring the form) using the admin convention (raw `animate-pulse rounded-md bg-muted-foreground/10` divs).
- [x] **Admin main matches user background** — `app/admin/layout.tsx` `<main>` changed from `bg-muted` (flat gray canvas) to `bg-background bg-radial-glow`, so the admin content area is white with the same faint primary radial glow as `(public)`/`(citizen)` pages. This makes admin form fields (which use `border-input`/transparent backgrounds by default) render identically to the user `/submit` form. It supersedes the earlier per-field workaround (below) whose root cause — a `bg-muted` canvas where `--input` == `--muted` — no longer applies; the `bg-background` overrides in `admin-report-edit-form.tsx` and the `className` prop on `photo-upload.tsx` were reverted so the shared field components stay at their defaults.
- [x] **Sidebar differentiated** — `components/admin/admin-sidebar.tsx` aside changed `bg-sidebar` (near-white) → `bg-muted` (light gray; lighter than main in dark mode `0.30` vs `0.21`) so it reads as a distinct rail against the white main. Nav link hover changed from `hover:bg-sidebar-accent` (invisible on the new surface) to `hover:bg-muted-foreground/10`; active state (`bg-primary/10 text-primary`) and Pending/Flags badges unchanged.
- [x] `context/ui-context.md` updated (glow now applies to admin; admin layout/sidebar description).
- [x] `npx tsc --noEmit` clean; `npm run build` passes with zero errors


### Social/SEO Polish (Tier 2)

- [x] `lib/site.ts` — `SITE_URL` constant (`process.env.NEXT_PUBLIC_SITE_URL || "https://bantay-kalsada.vercel.app"`), single source for metadata URLs
- [x] `lib/og-image.tsx` — shared `BrandCard` JSX + `OG_IMAGE_SIZE` (1200×630) for the default social card; token-based inline styles (brand blue gradient, wordmark, tagline)
- [x] `app/opengraph-image.tsx` + `app/twitter-image.tsx` — `ImageResponse` default cards (statically optimized, cached); applies to all routes unless overridden
- [x] `app/layout.tsx` — root `metadata` now has `metadataBase: new URL(SITE_URL)`, `alternates.canonical: "/"`, default `openGraph` (website, siteName, locale en) + `twitter` `summary_large_image`
- [x] `app/(public)/page.tsx` — `export const metadata` (title/description/OG/twitter, canonical `/`) + `<JsonLd>` with `Organization` + `WebSite` graph
- [x] `components/public/json-ld.tsx` — tiny `<script type="application/ld+json">` renderer
- [x] `app/(public)/browse/page.tsx` — `export const metadata` (canonical `/browse`)
- [x] `app/sitemap.ts` — `MetadataRoute.Sitemap` for `/`, `/browse`, `/about`, `/guidelines`, `/privacy`, `/terms`, `/disclaimer` (public pages only, static/cached)
- [x] `app/robots.ts` — `MetadataRoute.Robots` disallowing `/admin/`, `/api/`, `/my-reports`, `/my-feedback`, `/feedback`, `/offline-edit`, `/account`, `/verify-email`, `/auth/`, `/login`, `/register`, `/reset-password`; sitemap link
- [x] `proxy.ts` — matcher now excludes `sitemap.xml`, `robots.txt`, `opengraph-image`, `twitter-image` (per metadata docs guidance for cached special Route Handlers)
- [x] `npx tsc --noEmit` + `npm run build` pass with zero errors

### Static Content Pages: About / Privacy / Terms / Guidelines / Disclaimer

- [x] `components/public-footer.tsx` — shared footer extracted from the inline footers in
  `(public)/layout.tsx` and `(citizen)/layout.tsx`; links to Browse, About, Guidelines, Privacy,
  Terms, Disclaimer + copyright. Both layouts now render `<PublicFooter />` (dedup, single source).
- [x] `components/public/content-page.tsx` — `ContentPage` (title/intro container),
  `ContentSection` (bg-card rounded section cards), `ContentList` (bulleted list helper);
  tokens only, no inline hex.
- [x] `app/(public)/about/page.tsx` — mission, how-it-works, scope (Taytay only, 48h moderation),
  moderation, contact (mailto + /feedback link). `Metadata` exported.
- [x] `app/(public)/privacy/page.tsx` — RA 10173-aligned: collected data, purposes, public vs
  private fields, service providers (Vercel, Supabase, Cloudinary, Brevo, PhilSMS, OSM/Nominatim/
  TomTom, Google), retention, rights, cookies (none), children (13+), changes. `Metadata` exported.
- [x] `app/(public)/terms/page.tsx` — eligibility (13+, guardian for <18), account, acceptable use,
  submission rules, moderation, disclaimers, liability, termination, changes, governing law
  (Philippines). `Metadata` exported.
- [x] `app/(public)/guidelines/page.tsx` — what to report (5 categories verbatim from
  `reportCategoryEnum`), good-report checklist (title/description/severity/barangay/pin),
  photo rules (1–3, own photos, no faces), respectful comments, flagging (ALREADY_FIXED /
  WRONG_LOCATION), enforcement. `Metadata` exported.
- [x] `app/(public)/disclaimer/page.tsx` — citizen-supplied/unverified info, not an official
  service, NOT for emergencies (911 / PNP 122), use at own risk, no liability, moderation !=
  verification. `Metadata` exported.
- [x] `app/(auth)/register/page.tsx` — added "By creating an account, you agree to the Terms of
  Service and Privacy Policy" line with links to both new pages.
- [x] All 5 pages render as `○ (Static)` prerendered routes; `npm run build` passes with zero errors.
- [x] `components/public/content-page-skeleton.tsx` — shared `ContentPageSkeleton({ sections })` mirroring the ContentPage/ContentSection layout with `Skeleton` primitives; used by per-page `loading.tsx` files: `about` (5), `privacy` (10), `terms` (10), `guidelines` (6), `disclaimer` (6). Navigation-boundary loading states for the static pages.
- [x] Context updated — `app-codebase-context.md` (route-group table + File Organization),
  `ui-context.md` (content-page/Ft2 footer conventions), this tracker.

### Offline Submission (Mobile & Notifications v2.2)

- [x] `lib/cloudinary-upload.ts` — `uploadToCloudinary(file)` extracted from `photo-upload.tsx`; shared by the photo widget and the queue processor
- [x] `lib/offline-queue.ts` — hand-rolled IndexedDB wrapper (no `idb` dependency): `addQueuedReport`, `getQueuedReports`, `getQueuedReportsForUser`, `updateQueuedReport`, `removeQueuedReport`; `QueuedReport` stores `File` blobs + already-uploaded Cloudinary URLs; drafts are user-scoped via `userId`. `openDb()` memoizes a single shared connection (module-level promise) so concurrent callers can't race; it opens with no explicit version (never requests a version lower than the existing DB — fixes a `VersionError` when a prior self-heal had bumped the DB to v2), and if the store is missing on an existing DB it self-heals by reopening at `db.version + 1`; cache resets on `onversionchange`/`onclose` and on open error (fixes production `NotFoundError` — "object store was not found" — from fresh-connection opens without the store)
- [x] `lib/offline-submit.ts` — `submitQueuedReport(draft)`: uploads pending files → Cloudinary, assembles a normal `CreateReportInput`, replays `submitReport` (all existing server guards apply)
- [x] `components/reports/photo-upload.tsx` — offline-aware: files selected offline are held locally ("Saved locally" chip, no upload error), reported via `onChange(urls, pendingFiles)`; auto-uploads pending files on reconnect while the form is open. Offline path **skips type/size validation** so any camera/gallery capture can be added (fixes Android photos not retaining on offline submit); online path relaxed to accept HEIC/HEIF and files up to 10 MB
- [x] `components/reports/report-form.tsx` — raw submit handler branches on `!navigator.onLine` (queues directly, validates via `createReportSchema.omit({ photo_urls: true })` + manual photo count); online `submitReport` await wrapped in try/catch so a network `TypeError` falls back to queueing (previously an unhandled rejection / stuck spinner); offline + queued-confirmation banners; edit mode never queues; form reset via `reset()` + `resetKey` remount
- [x] `components/offline/offline-queue-processor.tsx` — drains the queue on mount / `online` / `visibilitychange`; `navigator.locks` + `processingRef` guard against double submits; skips drafts for the wrong session user; success removes draft, failure keeps it with `lastError`
- [x] `components/offline/offline-reports-panel.tsx` — "Saved offline reports" card on `/my-reports`: lists drafts (title, queued date, photo count), Retry / Discard buttons, `lastError` shown on failed drafts
- [x] Wired into `app/(citizen)/layout.tsx` (processor) and `app/(citizen)/my-reports/page.tsx` (panel)
- [x] Feature spec: `context/feature-specs/29-offline-submission.md`
- [x] Context updated — `project-overview.md` (In Scope), `architecture.md` (citizen boundary), `app-codebase-context.md` (offline data flow)
- [x] `npm run build` passes with zero errors; ESLint zero errors on touched files
- [x] No server, schema, migration, or dependency changes — `submitReport` remains the only write path

### Offline Report Editing & Offline Map (Offline Experience v2.3)

- [x] `lib/taytay-boundary.ts` — `TAYTAY_POLYGON` (full ~180-point list) + `isPointInTaytay()` ray-casting point-in-polygon helper; single source of truth
- [x] `components/maps/taytay-boundary.tsx` — re-imports `TAYTAY_POLYGON` from `lib/taytay-boundary` (removes duplicated array)
- [x] `lib/offline-queue.ts` — added `overwriteQueuedReport(id, updated)` (full replace; fixes queued-draft editing where `updateQueuedReport` only handled `lastError`)
- [x] `components/reports/photo-upload.tsx` — added `initialUrls`/`initialFiles` seeds (used to repopulate both Cloudinary URLs and local-blob `offlinePending` files when editing a draft)
- [x] `components/reports/report-form.tsx` — new props `draftId`, `draftMeta`, `draftInitialPhotoFiles`; `isDraft` mode: "Save draft only" button that calls `overwriteQueuedReport` (clears `lastError`); raw submit gates on offline schema + photo count + `isPointInTaytay`; photo seed handled for drafts
- [x] `components/offline/taytay-tiles-preloader.tsx` — warms OSM tiles at zoom 15–16 around Taytay center (14.5587, 121.136), radius 2 tiles, into the `static-image-assets` SW cache (best-effort; mounted in `ReportForm`)
- [x] `components/offline/offline-reports-panel.tsx` — "Edit" link per saved draft → `/offline-edit/[draftId]`
- [x] `app/(citizen)/offline-edit/[draftId]/page.tsx` — client route loading the draft from IndexedDB and rendering `ReportForm` in edit-draft mode
- [x] `npm run build` passes with zero errors (route `/offline-edit/[draftId]` compiles); ESLint zero errors on touched files

### Offline Upload UX & Reliability (Offline Experience v2.4)

- [x] `lib/offline-processing.ts` — tiny module-level store publishing the set of report ids currently being processed (`setProcessingIds` / `subscribeProcessing`); avoids prop drilling between processor, panel, and banner
- [x] `components/offline/offline-queue-processor.tsx` — `processQueue` now bails unless `navigator.onLine` (no more mount-time `fetch("/api/uploads/sign")` → spurious "Failed to fetch" while offline); publishes the active report id set at run start and clears it in `finally`
- [x] `components/offline/offline-upload-banner.tsx` — fixed bottom banner with spinner + skeleton shimmer; shows while any report is uploading; mounted in `(citizen)/layout.tsx`
- [x] `components/reports/report-form.tsx` — offline submit now awaits the IndexedDB write with a loading state; submit button shows a spinner + "Saving…" and is disabled until the draft is queued (previously fire-and-forget `void queueOfflineReport`)
- [x] `components/offline/offline-reports-panel.tsx` — subscribes to the processing store so each in-flight report shows an "Uploading…" spinner and its Edit/Retry/Discard buttons are disabled; refreshes drafts on `online` + `visibilitychange` so reports added/removed by the processor appear/disappear correctly
- [x] `lib/offline-submit.ts` — network `TypeError`/`fetch|network|load failed` errors now map to a friendly "You're offline — this report will auto-submit when you're back online." instead of raw "Failed to fetch"
- [x] `npm run build` passes with zero errors; ESLint zero errors on touched files

### Offline Detection & Reliability (Offline Experience v2.5)

- [x] `app/api/healthz/route.ts` — lightweight `204` connectivity probe endpoint (no auth, no rate limit, SW-cacheable)
- [x] `lib/use-online.ts` — `useOnline()` hook: combines `navigator.onLine` + a real `/api/healthz` probe so "offline" is detected even when DevTools SW-offline keeps `navigator.onLine` true (the root cause of PC "failed to fetch"/"submit does nothing")
- [x] `components/reports/photo-upload.tsx` — replaced local `isOffline` with `useOnline`; on a Cloudinary network error the file is kept as a local `offlinePending` blob (instead of a terminal "failed to fetch" error) and reported via `onChange` so it uploads later
- [x] `components/reports/report-form.tsx` — offline gate now uses `useOnline().isOnline`; photo files that failed due to network are retained and included when queueing offline
- [x] `components/reports/report-form.tsx` — `LocationPickerWrapper` seeds `value` for `isEdit` OR `isDraft`, so a saved draft shows its pinned location (fixes "offline report has no location unless edited")
- [x] `npm run build` passes with zero errors; ESLint zero errors on touched files

### Public REST API (Ecosystem v3.0+)

- [x] Migration `20250801000001_create_api_request_log.sql` — `api_request_log(id, ip_hash, created_at)` + index `(ip_hash, created_at)`; RLS enabled with no policies (service-role only access path)
- [x] Applied to remote via `supabase db query --linked`; table + index + RLS verified
- [x] `types/database.types.ts` regenerated via `supabase gen types typescript --linked`
- [x] `lib/validations/api.ts` — `listReportsQuerySchema` (category/severity/status/barangay/q/page/page_size, `z.coerce` ints, empty strings dropped), `reportParamsSchema` (uuid), `publicReportSchema` + response types
- [x] `lib/api-rate-limit.ts` — `hashIp` (SHA-256 + pepper from `API_RATE_LIMIT_SECRET`), `clientIp`, `enforceApiRateLimit` (120/hr + 1,000/day sliding window, 1% prune chance, accurate `Retry-After`)
- [x] `lib/api-reports.ts` — `serializePublicReport` (whitelist + `getDisplayUrl` + public-status guard), `fetchPublicReports` (single round-trip count+range), `fetchPublicReportById`
- [x] `app/api/reports/route.ts` — list handler (validate → rate limit → service → `{ success, data }` + cache/CORS headers)
- [x] `app/api/reports/[id]/route.ts` — single handler (`await params` in Next 16), `400` invalid uuid / `404` not found
- [x] `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` + `Access-Control-Allow-Origin: *`
- [x] Feature spec `context/feature-specs/28-public-rest-api.md` written
- [x] Context updated — `project-overview.md` (In Scope), `architecture.md` (boundary + storage model)
- [x] `npm run build` passes with zero errors; typecheck clean
- [x] Smoke tests passed — list, all filters, pagination, `q` search (sanitized), `400` invalid params, `404`, rate limit 429 with `Retry-After`, CORS/cache headers, hashed-IP storage verified
- [x] Service-role deviation documented: rate-limit bookkeeping uses the service-role client because the table has no user association and zero RLS policies (documented in feature spec + architecture.md)

### Resolution Details (Phase B)*

- [x] Migration — `resolution_notes` (text, nullable) and `resolved_image_urls` (text[], default `'{}'`) columns on `reports` table
- [x] Database types — added both columns to `Row`, `Insert`, and `Update` types in `types/database.types.ts`
- [x] Zod schema — extended `resolveReportSchema` with optional `resolutionNotes` (max 2000 chars) and `resolvedImageUrls` (1–3 URLs)
- [x] Server Action — `resolveReport` now accepts optional notes + image URLs, writes them alongside `status`/`resolved_at`; `bulkResolveReports` stays minimal (no notes/photos in bulk)
- [x] Admin resolve dialog — replaces one-click resolve with a Shadcn `Dialog` containing optional textarea (with char counter) and `PhotoUpload` widget; only Confirm sends the data
- [x] Email — `renderResolvedEmail` now accepts optional `resolutionNotes` and renders a blue-tipped info box inline when present
- [x] Notification helper — `sendReportNotifications` passes `resolutionNotes` through to the email renderer
- [x] `PhotoGallery` — extended with optional `resolvedImageUrls` prop; renders a separate "After Resolution" carousel below original photos with a blue left-border separator; lightbox navigates within each source independently
- [x] Public detail page — shows "Resolution Update" section (blue left border, notes, resolved_at date) and resolution gallery when report is RESOLVED
- [x] Citizen detail page — same resolution section as public page
- [x] Admin review page — shows resolution notes in a `CheckCheck`-icon alert card and resolution gallery; `CheckCheck` icon imported
- [x] Mock data — RESOLVED mock reports include sample `resolution_notes` and `resolved_image_urls`
- [x] `npm run build` passes with zero errors

### SMS Notifications (v3.0)

- [x] Migration — `phone` (text, nullable) and `sms_notifications` (boolean, default false) on `profiles` table
- [x] Database types — added `phone` and `sms_notifications` to profiles Row/Insert/Update types
- [x] `lib/sms.ts` — PhilSMS client with `sendSMS()` and `normalizePhoneNumber()`; 3-attempt retry with 1s delay
- [x] `lib/notifications.ts` — `getSmsMessageForType()` for SMS-friendly status messages (approved, rejected, resolved)
- [x] Zod schema — `updateProfileSettingsSchema` with PH phone validation regex, `phoneSchema`
- [x] Server Action — `updateProfileSettings` in `app/actions.ts` normalizes phone, saves to profiles
- [x] Account settings page — `app/(citizen)/account/page.tsx` + `account-form.tsx` with phone input + SMS toggle
- [x] Nav links — "Account Settings" added to both desktop dropdown and mobile sheet
- [x] `lib/admin-notifications.tsx` — extends `fetchReportWithSubmitter` to select phone/sms_notifications; `sendReportNotifications` conditionally dispatches SMS after email with retry + log on failure; returns `{ smsError? }` so callers can surface SMS issues
- [x] `lib/sms.ts` — added `sendTestSms()` helper for the "Send Test SMS" button on account page
- [x] `app/actions.ts` — added `sendTestSms` Server Action for testing PhilSMS integration
- [x] `app/(citizen)/account/account-form.tsx` — added "Send Test SMS" button with loading state
- [x] `app/admin/actions.ts` — all six callers of `sendReportNotifications` (`approveReport`, `rejectReport`, `resolveReport`, `bulkApproveReports`, `bulkRejectReports`, `bulkResolveReports`) now `await` the result and log `smsError` to console instead of fire-and-forget `.catch()`
- [x] Email and SMS are fully independent — email failures wrapped in try/catch so SMS still fires
- [x] `npm run build` passes with zero errors
- [x] `lib/sms.ts` — `token.trim()` added to strip accidental whitespace from env var
- [x] `app/api/sms/diagnose/route.ts` — admin-only diagnostic endpoint (`GET /api/sms/diagnose`) that fetches PhilSMS `/v3/me` and `/v3/balance` to verify token validity and credit balance
- [x] `lib/sms.ts` — `token.trim()` added to strip accidental whitespace from env var
- [x] `lib/sms.ts` — hardcoded `PHILSMS_ENDPOINT` replaced with `process.env.PHILSMS_API_BASE` (defaults to `https://app.philsms.com`); supports switching between old and new PhilSMS dashboard
- [x] `app/api/sms/diagnose/route.ts` — admin-only diagnostic endpoint (`GET /api/sms/diagnose`) that probes both `app.philsms.com` and `dashboard.philsms.com` `/v3/me` and `/v3/balance` to verify token validity and credit balance side by side
- [x] SMS confirmed working — PhilSMS new dashboard (`dashboard.philsms.com`) + its API token + `PHILSMS_API_BASE` set to `https://dashboard.philsms.com`
- [x] `npm run build` passes with zero errors

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

### Admin Note on Feedback (Complete)
- [x] Migration: `FEEDBACK_NOTE_ADDED` added to `notification_type` enum (`20250710000001`)
- [x] Zod schema: `updateFeedbackNoteSchema` in `lib/validations/feedback.ts`
- [x] Notifications lib: `FEEDBACK_NOTE_ADDED` type, message, subject in `lib/notifications.ts`
- [x] Email template: `renderFeedbackNoteAddedEmail` in `emails/render.ts`
- [x] Notification dispatcher: `sendFeedbackNotifications` extended for note type in `lib/admin-feedback-notifications.tsx`
- [x] Server Action: `updateFeedbackNote` in `app/admin/actions.ts` — only notifies on null→value transition
- [x] Client component: `FeedbackNoteEditor` in `components/admin/feedback-note-editor.tsx` — editable textarea, Save/Remove buttons, character counter
- [x] Admin page: read-only textarea replaced with `<FeedbackNoteEditor>` in `app/admin/feedback/[id]/page.tsx`
- [x] Notification bell: `FEEDBACK_NOTE_ADDED` icon + color added
- [x] Supabase types: `database.types.ts` updated
- [x] Feature spec: `context/feature-specs/16-admin-note-feature.md`
- [x] `npm run build` passes

### Dark Mode

- [x] Added `.dark` CSS variable block in `app/globals.css` — neutral slate dark palette with matching sidebar tokens
- [x] Added dark variant of `bg-auth-gradient` utility for auth pages
- [x] Wrapped root layout with `<ThemeProvider>` from `next-themes` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`) + `suppressHydrationWarning` on `<html>`
- [x] Created `components/theme-toggle.tsx` — cycles Light ↔ Dark (2-state), renders Sun/Moon icon based on `resolvedTheme`, mounted guard to prevent hydration mismatch
- [x] Added `<ThemeToggle />` to `components/public-nav.tsx` — placed in desktop nav between browse link and auth/user block; on mobile, rendered on the top bar beside the hamburger icon (not inside the sheet)
- [x] Lightened dark palette per feedback — background `oklch(0.145→0.21)`, card `oklch(0.205→0.26)`, muted/border `oklch(0.269→0.30)` for easier readability
- [x] Fixed toggle UX — replaced 3-state cycle (light→dark→system) with 2-state using `resolvedTheme`, one click always switches immediately
- [x] Reverted map tiles to standard OSM in all themes — dark CartoDB tiles were too hard to read, maps stay light regardless of theme
- [x] Added `<ThemeToggle />` to `components/admin/admin-sidebar.tsx` — in sidebar header area, right side of logo
- [x] Added `<ThemeToggle />` to `app/(auth)/layout.tsx` — fixed top-right corner on login/register/reset-password pages for unauthenticated visitors
- [x] Updated `app/admin/feedback/page.tsx` — colored `MessageSquare` icon heading with inline count `(N)`, wrapped table in `bg-card` container matching queue page pattern
- [x] Updated `context/ui-context.md` — removed "Light mode only. No dark mode in MVP", documented dark mode support
- [x] Moved mobile ThemeToggle from inside sheet sidebar to top bar beside hamburger — keeps it accessible without opening the drawer; grouped in a single `sm:hidden` flex row with the Sheet trigger
- [x] `npm run build` passes with zero errors

### PWA Support

- [x] Installed `@serwist/next` + `serwist` — service worker bundling via webpack
- [x] Generated app icons (192x192, 512x512, Apple 180x180) from existing logo
- [x] Created `public/manifest.json` — app name, display mode, theme/background colors, icons
- [x] Created `app/sw.ts` — service worker entry with `defaultCache`, `skipWaiting`, `clientsClaim`, `navigationPreload`
- [x] Updated `next.config.ts` — `withSerwist()` plugin, `--webpack` flag for Next.js 16 compatibility
- [x] Updated `app/layout.tsx` — `manifest` + `icons` in metadata, `viewport` export with `themeColor`
- [x] Created `components/install-prompt.tsx` — client component with 5 states (hidden, promptable, installing, dismissed, installed)
- [x] Added `<InstallPrompt />` to `app/(public)/layout.tsx` — bottom banner for non-standalone users
- [x] Feature spec: `context/feature-specs/17-pwa-support.md`
- [x] `npm run build` passes with zero errors; SW generated at `public/sw.js` (~50KB)

### Bulk Admin Actions

- [x] Created `lib/validations/bulk.ts` — `bulkActionSchema` (min 1, max 50 UUIDs), `bulkRejectSchema` (adds 10-char rejection reason)
- [x] Added `bulkApproveReports`, `bulkRejectReports`, `bulkResolveReports` Server Actions in `app/admin/actions.ts` — verifies admin once, iterates with status checks + per-report notifications, returns processed count
- [x] Created `components/admin/bulk-action-bar.tsx` — floating bottom bar with item count, Deselect all, action buttons; opens rejection Dialog for bulk reject with shared reason
- [x] Updated `components/admin/admin-queue-table.tsx` — added "use client", checkbox column with select-all header toggle, selection state via `Set<string>`, renders `<BulkActionBar>` when items selected; accepts optional `bulkActions` prop
- [x] Updated `app/admin/pending/page.tsx` — passes `bulkActions` with approve + reject to table
- [x] Updated `app/admin/approved/page.tsx` — passes `bulkActions` with resolve to table
- [x] Selection is current-page only (clears on page change), rejection uses a single shared reason dialog
- [x] `npm run build` passes with zero errors

## Community Features (v2.1)
- [x] **Severity tagging** — Minor / Urgent / Emergency enum, radio group on submit form, colored badges on feed + detail pages
- [x] **Comments on reports** — threaded discussion with admin moderation
- **Nearby existing reports on submit** — show existing reports within X meters when pinning a location

## Next Up


### Share Report via Link/Social

- [x] Added `generateMetadata` to `app/(public)/reports/[id]/page.tsx` — dynamic `og:title`, `og:description`, `og:image` (first Cloudinary photo via `getDisplayUrl`), `og:url`, `og:type: article`, `twitter:card: summary_large_image`; description truncated to 160 chars; no `og:image` when report has no photos
- [x] Created `components/reports/share-button.tsx` — client component using `navigator.share()` with fallback to `navigator.clipboard.writeText()` + toast feedback
- [x] Added `<ShareButton>` to report detail page — positioned in the top-right, beside "Back to reports"
- [x] Feature spec: `context/feature-specs/18-share-report.md`
- [x] `npm run build` passes with zero errors

### Photo Lightbox

- [x] Updated `components/browse/photo-gallery.tsx` — added full-screen lightbox overlay with `bg-black/90` backdrop, `object-contain` (no cropping), X close button, keyboard Escape/arrow navigation, prev/next buttons for multi-photo reports, body scroll lock when open, and click-outside-to-close. Lightbox automatically available on all 5 pages that use `PhotoGallery` (public report detail, citizen my-reports, citizen my-feedback, admin report review, admin feedback review).
- [x] `npm run build` passes with zero errors

### Quick Wins (v2.0)
- [x] **Share report via link/social** — OG meta tags on report detail pages + share button via `navigator.share()`
- [x] **Dark mode** — `next-themes` integration with existing CSS tokens, toggle in nav
- [x] **PWA support** — manifest, service worker, app icons, install prompt
- [x] **Bulk admin actions** — multi-select checkboxes on queue pages with batch approve/reject Server Action
- [x] **Export admin reports to CSV** — `lib/csv.ts` (BOM-prefixed UTF-8, proper field escaping), `GET /api/admin/export?status=` API route (admin-only, auth + role guard, fetches all matching reports + profile join, returns CSV download), Export CSV buttons on all 4 queue pages + Export All CSV button on dashboard
- [x] **Base map layer toggle** — Street / Terrain / Satellite selector on browse map via local dropdown (no Radix portal to avoid Leaflet conflict), `key={baseMap}` for clean TileLayer remounting, per-source `maxZoom`, `maxZoom={19}` on `MapContainer`

### Community Features (v2.1)
- [x] **Report severity tagging** — Minor / Urgent / Emergency enum, radio group on submit form, colored badges on feed + detail pages
- [x] **Comments on reports** — single-level threaded discussion with admin moderation, COMMENT_ADDED notifications, edit/delete by author, soft-delete by admin
- [x] **Comments bug fixes** — `author_name` denormalization (removed broken FK join to profiles), optimistic insert (instant display on post), optimistic delete/remove (instant UI), `cancelled` flag pattern (race condition fix), reports RLS fix (TO anon → all roles for EXISTS subquery), service worker cache invalidation note
- [x] **Security fixes (v2.1.1)** — notification DELETE RLS policy + switched to anon-key client (removed service role misuse), comment rate limiting (30/24h) + INSERT RLS report status guard, Cloudinary sign endpoint auth check + rate limiting (30/hr via `upload_sign_log` table), comment notification message uses author name, `updateFeedbackNote` empty-string edge case fix
- [x] **Nearby existing reports on submit** — PostGIS spatial query shows existing APPROVED/RESOLVED reports within 200m on the submission map when pinning a location

### Municipality Scope — Taytay, Rizal

- [x] Feature spec written — `context/feature-specs/22-municipality-scope.md`
- [x] Migration — `barangay` enum (`20250713000004`)
- [x] Migration — `municipality_boundaries` table + Taytay polygon insert (`20250713000005`)
- [x] Migration — `barangay` column on `reports` (`20250713000006`)
- [x] Migration — boundary trigger `trg_reports_location_boundary` (`20250713000007_add_report_location_boundary_trigger.sql`)
- [x] Migration — `is_within_boundary` RPC (`20250713000008`)
- [x] `types/database.types.ts` — added `barangay` enum, `municipality_boundaries` table, `is_within_boundary` function, `barangay` column on `reports`
- [x] `context/data-model.md` — added `barangay` enum, `municipality_boundaries` table, `barangay` column on `reports`, `report_within_taytay` constraint, `is_within_boundary` RPC, boundary index, validation rules
- [x] Context — `project-overview.md` updated (overview, features, scope, success criteria)
- [x] Context — `architecture.md` updated (boundaries, storage model, invariant 18)
- [x] Zod — `barangayEnum` added to `createReportSchema` / `submitReportSchema`
- [x] Server Action — `is_within_boundary` RPC call before insert + `barangay` in payload
- [x] Form — barangay dropdown in `report-form.tsx`
- [x] Map — default center + zoom to Taytay, reverse geo for barangay, info banner in `location-picker.tsx`
- [x] `npm run build` — zero errors
- [x] Landing — localized Taytay copy in `page.tsx`
- [x] Browse — barangay filter in `filter-bar.tsx`, URL param in `browse/page.tsx`
- [x] Card — barangay label in `report-card.tsx`
- [x] Detail — barangay in report metadata (`reports/[id]/page.tsx`)
- [x] `npm run build` — zero errors
- [x] Admin — barangay column in `admin-queue-table.tsx`, barangay in queue page queries, display on review page, barangay distribution chart in analytics
- [x] Boundary enforcement tested (inside/outside Taytay via trigger + `is_within_boundary` RPC). Barangay is selected manually via `InlineSelect` — Nominatim auto-detect was NOT implemented (reverse geocode sets `location_label` only).

### Push Notifications + Realtime Live Badge (v2.2)

- [x] `web-push` npm package installed; VAPID keys generated and added to `.env.local`
- [x] `supabase/migrations/20250727000001_add_push_subscriptions.sql` created — `push_subscriptions` table (id, user_id, subscription JSON, created_at)
- [x] `lib/push.ts` — `sendPushNotification()` with VAPID config, subscription cleanup on expired keys
- [x] `app/sw.ts` — `push` and `notificationclick` event listeners for receiving and handling push notifications
- [x] `components/push-subscription-manager.tsx` — `PushSubscriptionManager`, `requestPushSubscription()`, `unsubscribeFromPush()` exported
- [x] `app/actions.ts` — `savePushSubscription` Server Action for persisting browser subscriptions
- [x] `lib/admin-notifications.tsx` — push wired after SMS dispatch in `sendReportNotifications`
- [x] `lib/admin-feedback-notifications.tsx` — push wired after email dispatch in `sendFeedbackNotifications`
- [x] `app/actions.ts` — push wired in `addComment` after notification insert
- [x] `components/notification-bell.tsx` — Supabase Realtime channel for live unread count updates
- [x] `app/(citizen)/account/page.tsx` — fetches `push_subscriptions` count, passes `pushSubscribed` + `userId` to form
- [x] `app/(citizen)/account/account-form.tsx` — push enable/disable toggle button with permission request/unsubscribe
- [x] `app/(citizen)/layout.tsx` — mounts `PushSubscriptionManager` for logged-in users
- [x] `types/database.types.ts` — `push_subscriptions` table added to types
- [x] `@types/web-push` installed
- [x] Feature spec: `context/feature-specs/26-push-notifications.md`
- [x] `npm run build` passes with zero errors

### Bugs Fixed During Implementation

- [x] **SW not available in dev** — serwist is disabled in dev mode (`next.config.ts:9`), causing `navigator.serviceWorker.ready` to hang indefinitely. Fixed by wrapping in `Promise.race` with 15s timeout that rejects with a clear error message.
- [x] **SW `no-response` navigation error** — `navigationPreload: true` caused race condition where SW preload completed before the page fetch, producing `no-response` errors. Fixed by setting `navigationPreload: false` in `app/sw.ts`.
- [x] **VAPID private key validation** — `webpush.setVapidDetails()` rejects base64 keys with `=` padding. Fixed by adding `.replace(/=+$/, "")` to both VAPID keys in `lib/push.ts`.
- [x] **VAPID env var whitespace** — trailing whitespace/newlines in `.env.local` VAPID keys caused invalid key format. Fixed by adding `.trim()` in both `lib/push.ts` and `components/push-subscription-manager.tsx`.
- [x] **Duplicate env vars** — `.env.local` had duplicate VAPID key entries; the last entry (with spaces in the private key) won, causing validation failure. Fixed by removing the duplicate block.
- [x] **Server Action error mapping** — Chrome's `AbortError: Registration failed - push service error` was shown raw to the user. Fixed by categorizing error by `err.name` and showing actionable messages (Brave FCM fix, try Firefox, etc.).
- [x] **Dynamic import of Server Action** — `await import("@/app/actions")` in a client component caused "Server Components render" error in production due to chunk resolution issues. Fixed by using static `import { savePushSubscription } from "@/app/actions"` instead.
- [x] **Nested object Server Action serialization** — Next.js production build can fail serializing nested `PushSubscriptionJSON` objects through the Server Action boundary. Fixed by accepting a pre-serialized `subscriptionJson: string` and parsing internally with `JSON.parse()`.
- [x] **Button doesn't toggle after subscribe** — `pushSubscribed` prop only updated on page reload. Fixed by adding `router.refresh()` after successful subscribe/unsubscribe in `handleTogglePush`.
- [x] **`[object Object]` JSON parse error** — `saveSubscription` was called with a parsed object (`JSON.parse`) instead of a JSON string after the parameter type changed to `string`. Fixed by passing `JSON.stringify()` directly.

### Mobile & Notifications (v2.2)
- **Offline submission** — queue report data in localStorage, submit on reconnect (complete, see "Offline Submission" below)
- **Geographic search / barangay filter** — filter browse feed by location

### Admin Power Tools (v3.0)
- **Report editing by admin** — allow admins to fix typos, recategorise, adjust map pin
- **Citizen report flagging** — "Already fixed" / "Wrong location" button on report pages
- **Activity log / audit trail** — view who approved/rejected each report and when
- **Report lifecycle timeline** — visual timeline on detail page (submitted → reviewed → resolved)

### Ecosystem (v3.0+)
- **LGU / DPWH dashboard** — region-scoped admin roles with filtered view
- [x] **Public REST API** — expose approved reports to third-party consumers (complete, see "Public REST API (Ecosystem v3.0+)" above)
- **SMS multi-provider** — add fallback SMS gateway option
- **Multi-language support** — Filipino + English + Cebuano/Ilocano

## Open Questions

- None.

## Architecture Decisions

### Multi-Municipality Future Direction (Recorded, Not In Scope)

- **Decision:** Bantay Kalsada is the seed of a province-wide, multi-municipality civic platform for
  Rizal. Single **multi-tenant app** (one Next.js app, one Supabase DB) — not one instance per
  municipality. Municipality = a `municipality` dimension on `reports` + routing + scoped roles.
- **Recorded as a roadmap only** — `context/project-overview.md` now has a `## Future Plan` section
  with a 4-phase plan (Prove Taytay → Retain → Pilot municipalities → Province-wide) and gates.
- **Not building any multi-tenancy now.** Multi-municipality deployment, region-scoped roles, and
  government integration stay **Out of Scope** until an explicit scope decision starts a phase.
- **Current-phase implications (cheap now, expensive later):** keep the Public REST API contract
  additive (`?municipality=` / `municipality` field later); keep `municipality_boundaries` multi-row;
  shape `profiles` so a future `municipality_id` slots in cleanly; keep RLS migration-friendly.
- **Sustainability constraint:** free tiers (Vercel Hobby, Supabase free, Cloudinary credits,
  PhilSMS per-message cost) are a PoC runway, not a province-scale foundation — a revenue path must
  be secured before Phase 4.

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
- **Social login** — Google OAuth added in v1 (see spec 11-oauth-google.md).
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

### TomTom API URL Fix — Legacy → Orbis v2
- [x] **TomTom tile URL updated** — The proxy route was using the deprecated v1 endpoint
  (`.../traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png`), which returned 404 for all
  tiles. Changed to the current Orbis v2 format:
  `.../maps/orbis/traffic/flow/raster/tile/{z}/{x}/{y}?apiVersion=2&style=light`.
  Verified that the Orbis v2 endpoint is the actively maintained one per TomTom docs
  (last edit: 2026.03.11), while the v1 page was last edited 2022.08.15.

- [x] `npm run build` passes with zero errors

### Citizen Can Edit Their Own Pending Report

- [x] `PhotoUpload` — accepts optional `initialUrls` prop for edit mode, lazy-initializes state from existing Cloudinary URLs
- [x] `report-form.tsx` — accepts `defaultValues?: CreateReportInput` and `reportId?: string` props; calls `updateReport` in edit mode; shows "Update Report" button with Save icon; passes initial photos/location to sub-components
- [x] `app/actions.ts` — `updateReport` Server Action: auth check, ownership guard, PENDING status guard, conditional boundary RPC on lat/lng change, Zod validation, UPDATE query
- [x] `app/(citizen)/my-reports/[id]/edit/page.tsx` — server component that fetches report, verifies ownership + PENDING, renders `ReportForm` with defaultValues
- [x] `app/(citizen)/my-reports/[id]/page.tsx` — added "Edit" button in header when `status === "PENDING"`
- [x] Created `supabase/migrations/20250730000001_add_reports_update_rls_policy.sql` — adds `"Citizens can update their own pending reports"` UPDATE policy; without it `supabase-js` UPDATE calls are silently rejected by RLS default-deny
- [x] `context/architecture.md` — citizen section now mentions `updateReport` + edit page; access control tier updated to include `UPDATE` for citizens
- [x] `context/data-model.md` — `reports` RLS section now includes the UPDATE policy
- [x] `npm run build` passes with zero errors

### Citizen Report Flagging (v3.0)

- [x] Migration `20250730000002_create_report_flags.sql` — `report_flag_type` enum (`ALREADY_FIXED`, `WRONG_LOCATION`), `report_flags` table with `UNIQUE (report_id, user_id)`, GIST-friendly index on `report_id`, INSERT/SELECT RLS policies, `REPORT_FLAGGED` added to `notification_type`
- [x] `types/database.types.ts` — `report_flags` table (Row/Insert/Update), `report_flag_type` enum, `REPORT_FLAGGED` notification value
- [x] Zod — `flagReportSchema` (`reportId` uuid, `flagType` enum) in `lib/validations/report.ts`
- [x] `lib/notifications.ts` — `REPORT_FLAGGED` in `NotificationType` union, `getMessageForType`, `getSubjectForType`
- [x] `app/actions.ts` — `flagReport` Server Action (toggle semantics: INSERT on first flag, DELETE to unflag, UPDATE to switch type; admin in-app notifications only on INSERT)
- [x] `components/reports/flag-report-buttons.tsx` — two toggle buttons (Already fixed / Wrong location) with loading/active/submitting/error states, fetches own flag on mount
- [x] Public detail page — renders `FlagReportButtons` below description when logged in and not the owner
- [x] `components/notification-bell.tsx` — Flag icon, yellow tint, routes `REPORT_FLAGGED` to `/admin/reports/[id]`
- [x] Admin report review page — "Citizen Flags" card (type, flagger name, date, empty state)
- [x] Admin sidebar — new "Flags" nav item with count badge (distinct flagged report_ids)
- [x] `app/admin/flags/page.tsx` — lists reports with active flags, each linking to admin review page
- [x] Feature spec: `context/feature-specs/27-citizen-report-flagging.md`
- [x] Applied to remote — linked Supabase project (`gvhyajfarhdbmgkloeit`), ran migration `20250730000002_create_report_flags.sql` via `supabase db query --linked`; verified `report_flags` table, `report_flag_type` enum, `REPORT_FLAGGED` notification value, and both RLS policies exist (the `20250730000001` edit-pending RLS policy was already applied). CLI migration history table is out of sync (only `20250709000001` recorded — DB was set up manually via dashboard), so migrations are applied via `db query` rather than `migration up`.
- [x] **Toggle bug fix (RLS)** — user reported that after flagging once, switching type / re-toggling failed (button disabled, no state change). Root cause: `report_flags` only had INSERT/SELECT RLS policies, so the `flagReport` Server Action's UPDATE (switch type) and DELETE (unflag) branches via the anon-key server client were silently blocked by RLS default-deny — same class of bug as the earlier missing `reports` UPDATE policy. Fix: migration `20250731000001_add_report_flags_update_delete_policies.sql` adds `"Citizens can update own flags"` (UPDATE, USING + WITH CHECK `auth.uid() = user_id`) and `"Citizens can delete own flags"` (DELETE, USING `auth.uid() = user_id`).
- [x] Applied migration `20250731000001_add_report_flags_update_delete_policies.sql` to remote via `supabase db query --linked`; verified all four `report_flags` policies (INSERT/SELECT/UPDATE/DELETE) exist remotely
- [x] **Allow both flags (dual-flag change)** — user requested both flag types be toggleable at once. Migration `20250731000002_allow_dual_report_flags.sql` drops `UNIQUE (report_id, user_id)` and adds `UNIQUE (report_id, user_id, flag_type)`; applied to remote and verified (`report_flags_unique_per_type` present, old constraint gone). `flagReport` Server Action now filters the existing-row lookup by `flag_type` and only INSERT/DELETE (UPDATE branch removed; notification on every INSERT per user decision). `FlagReportButtons` tracks `activeFlags: FlagType[]`, fetches with a multi-row select (dropped `.maybeSingle()`), and each button toggles independently (only self-disables while pending). Admin pages needed no changes (review card lists rows per flag; `/admin/flags` already dedupes types). Docs updated: `data-model.md` (constraint + invariant), feature spec `27` (semantics/states/edge cases/files), `architecture.md` note.
- [x] `npm run build` passes with zero errors

### Soft Radial Glow Background (User-Side Pages)
- [x] **Radial glow background** — Added `bg-radial-glow` utility to `app/globals.css`
  using `radial-gradient(ellipse at 50% 0%, oklch(0.488 0.243 264 / 0.06) 0%, transparent 60%)`.
  Applied to `<main className="flex-1 bg-radial-glow">` in both `(public)/layout.tsx` and
  `(citizen)/layout.tsx`. Replaces the previous dot grid pattern (was too busy for the
  civic aesthetic). Very faint primary-tinted wash emanating from the top-center of the
  content area — adds subtle depth without competing with content. Auth pages maintain
  gradient background; admin panel unchanged.

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

## Doc Alignment & Fixes (post-Taytay testing)

- **`data-model.md` synced to schema** — added the schema pieces that existed in `supabase/migrations/` but were never documented: `resolution_notes` + `resolved_image_urls` on `reports` (`20250719000001`), `push_subscriptions` table + its RLS/index/relationship/validation rows (`20250727000001`), `api_request_log` table + RLS (no policies, service-role-only) (`20250801000001`), `FEEDBACK_NOTE_ADDED` and `OFFLINE_SUBMIT_FAILED` in `notification_type`, and `offline_queue_id` on `notifications` (`20250710000001`, `20250806000001`). Updated "What Lives in the Database", Relationships, Indexes, RLS, and Business Validation Rules sections.
- **`app-codebase-context.md` synced** — route-group table now lists `/account`, `/offline-edit/[draftId]`, `/my-reports/[id]/edit`, and admin `/flags`; notifications producer table now includes `flagReport` → `REPORT_FLAGGED` and `createOfflineSubmitFailedNotification` → `OFFLINE_SUBMIT_FAILED` with link targets; File Organization Reference refreshed for the full current tree (offline libs/components, SMS/push, REST API, traffic tiles, healthz, back-button, theme-toggle, share/flag/location-label components); intro line updated to cover the newer feature set.

- **Report card tag overflow fix** — `components/reports/report-card.tsx`: added `flex-wrap` to the category/severity/status/date row so tags wrap instead of being clipped by the card's `overflow-hidden` on narrow cards (mobile / 5-column grid). One-word change, build verified.
- **Search behavior confirmed intentional** — ILIKE keyword search matching both `title` and `description` (not title only) is by design per `feature-specs/09-search-design.md`. No change made.
- **Spec `22-municipality-scope.md` reconciled with implementation** — The spec still read as a pre-implementation plan and described behavior that was never built. Corrected: (1) barangay is **manually selected** via `InlineSelect`, not Nominatim auto-detected — reverse geocode only sets `location_label`; (2) boundary enforced by `trg_reports_location_boundary` trigger using inline `ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geometry` (not `NEW.location`, which is NULL in BEFORE INSERT on PG17), not a CHECK constraint; (3) `barangay` column stays nullable (no backfill/NOT NULL); (4) default map center is `14.5587, 121.1360` (was documented as `14.5692, 121.1326`); (5) Files Created table fixed to real migration filenames incl. `20250713000009_add_reports_rls_policies.sql`, plus `taytay-boundary.tsx` and `inline-select.tsx`; (6) Implementation Status + checklists flipped to complete, auto-detect marked "not implemented"; (7) admin queue barangay **filter** was never built (column + analytics chart only).
- **`architecture.md`** — line describing barangay as "auto-detected from Nominatim" corrected to manual `InlineSelect` selection.
- **`data-model.md`** — `reports.barangay` note corrected (manual selection, stays nullable); illustrative `is_within_boundary` example coordinate aligned to `14.5587, 121.1360`.

## Session Notes — Browse Heatmap (Phase A)

- **`leaflet.heat` global-`L` binding (root-cause fix).** `leaflet.heat@0.2.0` is a bare IIFE (no UMD) that does `L.heatLayer = …` on the **global** `L`. Webpack Leaflet does not set a global `L`, and the imported `L` can be a different object than `window.L`. A static `import "leaflet.heat"` therefore attaches `heatLayer` to a global the component never reads → the `L.heatLayer` guard silently returns → blank layer, no error. Fix in `components/maps/heat-layer.tsx`: set `window.L = L` then `await import("leaflet.heat")`, resolve `heatLayer` from `window.L ?? L`. Verified rendering (red/blue/orange intensity blobs). See `feature-specs/23-heatmap.md` → Implementation Notes.
- **Stale PWA service worker hides new map code.** `@serwist/next` precaches the JS bundle, so after a code change `/browse` kept serving the old cached page (no toggle visible). Fix during dev: DevTools → Unregister SW + hard-reload. Known dev gotcha (app-codebase-context.md already notes it).
- **Heatmap tuning:** `radius: 30`, `blur: 20` for sparse Taytay data. External traffic source deferred — `getExternalHeatPoints()` in `lib/heatmap.ts` returns `[]` (Phase B, blocked on user-specified provider + keys).
- **Overlay (not a mode switch) implemented.** Replaced the Markers/Heatmap either/or toggle with markers-always-rendered + a single **Heat** on/off toggle (default on) showing the heat as an underlay beneath the clustered markers. Heat scope stays all Taytay (unfiltered); markers remain viewport-filtered. Captured in `feature-specs/23-heatmap.md` (rewritten to match the spec-10/13 format) and reflected in `architecture.md` + `app-codebase-context.md`.

## Bugfixes — Browse Map (Jul 17)

- **Dark-mode popup readability (Issue 1).** Leaflet popup has a hardcoded white background (`leaflet.css`). `.dark` Tailwind classes (`text-foreground`, `text-muted-foreground`, `bg-muted`) flip to light values in dark mode → light text on white, unreadable. **Fix:** added `browse-popup` class to the popup content `<div>` in `components/browse/browse-map.tsx:147`; added CSS overrides in `app/globals.css` forcing the popup wrapper/tip to white (`oklch(1 0 0)`) and class-children to light-mode color values (dark text, gray-100 badges). Verified: `npm run build` — zero errors.
- **Reset button crash with zero filtered reports (Issue 2).** `handleReset` built `L.latLngBounds(reports.map(...))`. When filters matched zero reports, `reports` was empty → `L.latLngBounds([])` invalid → `fitBounds` threw "Bounds are not valid". **Fix:** `handleReset` now checks `reports.length > 0` first, falls back to `allHeatPoints`; early-returns if both are empty. Also corrected tuple access (`p[0]`/`p[1]`) for `HeatPoint` format. Verified: `npm run build` — zero errors.

## Phase B — Traffic Heatmap (TomTom) [BUILT]

- **Grilled and locked.** Provider: TomTom Traffic Flow. Data: live congestion, server-cached (Supabase, 15-min TTL, ~20-pt bbox grid, strict free tier ≈1,920 calls/day < 2,500). Separate Traffic layer + toggle (UI changes — supersedes spec's "no UI change" note). Lazy fetch on toggle. Serverless deploy.
- **Plan written into** `feature-specs/23-heatmap.md` Phase B section.
- **Implementation complete (Jul 17).** All files created and modified per plan:
  - `lib/tomtom.ts` — `generateGrid()`, `buildTrafficGrid()` (TomTom fetch, concurrency-limited), `getTrafficHeatPoints()` (Supabase cache read/write, graceful degradation with/without key and with/without cache table).
  - `app/api/traffic/route.ts` — GET proxy, hides `TOMTOM_API_KEY`, returns `{ points }`.
  - `components/maps/heat-layer.tsx` — refactored to shared `HeatCanvas` (parameterized `max`/`gradient`/`radius`/`blur`) + `HeatLayer` wrapper (blue→red hazard ramp, unchanged interface).
  - `components/maps/traffic-layer.tsx` — `HeatCanvas` wrapper with green→yellow→red congestion ramp, `max: 10`, `radius: 35`.
  - `components/browse/browse-map.tsx` — `TrafficToggle` (default OFF), lazy fetch via `fetch("/api/traffic")` on toggle, `TrafficLayer` rendered as underlay; removed dead `externalPoints`/`getExternalHeatPoints` seam; `HeatToggle` and `TrafficToggle` stacked in a flex column container.
  - `supabase/migrations/20250717000010_add_traffic_cache.sql` — `traffic_cache(key text PK, points jsonb, fetched_at timestamptz)`.
  - `lib/heatmap.ts` — removed `getExternalHeatPoints()` function.
  - Context files (architecture, app-codebase, ui-context, progress-tracker) updated.
- **User must apply:** `TOMTOM_API_KEY` to `.env.local` + deploy secrets; apply `traffic_cache` migration to Supabase (`supabase db push` or SQL editor). Without key → toggle inert; without table → live-fetch works, caching degraded.
- **Verified:** `npm run build` passes with zero errors. Routes include new `GET /api/traffic`.

## Phase B — Redesign: Grid → Raster Tile Road Coloring (Jul 19)

**What changed:** The traffic heatmap grid approach (bbox grid, per-point TomTom Flow
calls, Supabase cache, `leaflet.heat`) was replaced with **TomTom Raster Flow Tiles** —
transparent PNG tiles that render green/yellow/orange/red directly on roads, same visual
as Google Maps traffic.

**Why:** The grid heatmap produced blurry isolated circles, not road-aligned colors. The
tile approach is visually correct, more efficient (tiles bundled, no per-point calls),
and simpler (no cache table, no grid tuning).

**Files deleted:**
- `lib/tomtom.ts` — grid generator, concurrency-limited fetcher, cache read/write
- `app/api/traffic/route.ts` — old points proxy
- `supabase/migrations/20250717000010_add_traffic_cache.sql`

**Files created:**
- `app/api/traffic/tiles/[z]/[x]/[y]/route.ts` — proxies TomTom raster flow PNG tiles,
  hides API key, sets `Cache-Control: max-age=300`

**Files modified:**
- `components/maps/traffic-layer.tsx` — replaced `HeatCanvas` wrapper with Leaflet
  `TileLayer` (`url="/api/traffic/tiles/{z}/{x}/{y}"`, `opacity: 0.6`, `zIndex: 500`)
- `components/browse/browse-map.tsx` — removed `trafficPoints` state, lazy fetch
  effect, points prop from `TrafficLayer`; toggle now mounts/unmounts `TrafficLayer`
  directly (TileLayer loads tiles automatically)
- Context files (spec 23, current-issues, test-checklist, progress-tracker)

**No DB migration needed.** No cache table. Key setup only.

**Verified:** `npm run build` passes with zero errors. Route:
`GET /api/traffic/tiles/[z]/[x]/[y]`.

### Phase B — Enhancements (post-build)
- [x] **Taytay boundary clip** — `TrafficLayer` (`components/maps/traffic-layer.tsx`) now
  passes `bounds={TAYTAY_BOUNDS}` to `TileLayer`, restricting tile requests to the Taytay
  bounding box `[14.48, 121.1] → [14.58, 121.17]`. Reduces TomTom free-tier tile
  consumption and keeps traffic overlay scoped to the municipality.
- [x] **Traffic legend** — `TrafficLegend` component renders a translucent pill at
  `bottom-4 left-4` showing four colored dots with labels: Light (green), Moderate
  (yellow), Heavy (orange), Severe (red). Visible only when Traffic toggle is ON.
- [x] **Toggle layout fix** — HeatToggle and TrafficToggle now sit side by side in a
  `flex-row` container; removed `absolute right-4 top-4 z-[1000]` from HeatToggle's
  className (was preventing it from participating in flex layout).

### Bug Fixes (post-build polish)

- [x] **Admin approve spinner stuck** — `components/admin/action-buttons.tsx` drove the
  Approve button with `useTransition`'s `isPending`, which stayed `true` when the
  `router.refresh()`+`router.push()` round trip inside the async transition never
  settled, leaving the button spinning until a hard reload. Replaced `useTransition`
  with a local `isSubmitting` boolean state set around the awaited action, matching the
  already-working Reject/Resolve buttons (`ResolveButton`, `RejectButton`). Spin state now
  clears deterministically as soon as the action resolves.
- [x] **Offline-submit error toast duration** — `toast.error` for failed offline reports
  auto-dismissed after 6s. Bumped `duration` to `30000` in both `offline-queue-processor.tsx`
  and `offline-reports-panel.tsx` so the submit-failure message stays readable.
- [x] **Offline auto-retry bounding** — the queue previously retried every queued report on
  every trigger (mount, `online`, `visibilitychange`) with no cap, cooldown, or toast dedup,
  so a persistent failure re-spammed errors. Now: `QueuedReport` gains `attemptCount` and
  `lastAttemptAt` (persisted in IndexedDB); max 3 auto-attempts with a fixed 2-minute cooldown;
  all error types (rate-limit, boundary, auth, validation, network) auto-retry silently up to
  3 times, then a single toast + a persistent "Retry manually" banner on the offline panel.
  A 60s background timer in `OfflineQueueProcessor` drives attempts 2–3 even without
  navigation/tab-switch/online events (the Web Lock + `processingRef` guard prevents overlap).
  Manual Retry keeps counting attempts (no reset) and the banner/allow-row disappears on submit
  or discard. `isTransientError` removed (no longer special-cased). Files: `lib/offline-queue.ts`,
  `lib/offline-submit.ts`, `components/offline/offline-queue-processor.tsx`,
  `components/offline/offline-reports-panel.tsx`.
- [x] **Auto-submit doesn't update the page** — after `OfflineQueueProcessor` auto-submits a
  queued report (on `online`/timer), `/my-reports` didn't show it until a manual reload:
  `MyReportsContent` is a server component that fetches once at page load and nothing
  re-rendered it after the background submit. Now the processor tracks `submittedAny` and calls
  `router.refresh()` after the loop (safe on any citizen page; doesn't reset client state), so
  the submitted list reflects the new report immediately. The saved-reports panel also stayed
  stale when the 60s timer (not an `online` event) did the submit — added
  `lib/offline-queue-events.ts` (`emitQueueChanged` / `subscribeQueueChanged`); the processor
  emits after `removeQueuedReport` and the panel re-reads IndexedDB on that event. Manual Retry
  already worked because `handleRetry` calls `router.refresh()`. Files:
  `lib/offline-queue-events.ts`, `components/offline/offline-queue-processor.tsx`,
  `components/offline/offline-reports-panel.tsx`.

### QA Pass (Aug 6) — Issues & Suggestions Round

- [x] **View toggle disappears on mobile** — not hidden, just scrolled off-screen inside the
  `overflow-x-auto` filter strip and dimmed by the mobile-only right-edge fade. Pulled the
  grid/map toggle out of the strip into its own always-visible row (`flex flex-col gap-2
  sm:flex-row`), leaving only the filters scrollable; fade now hugs the strip's right edge.
  File: `components/browse/filter-bar.tsx`.
- [x] **Offline report shows barangay only (no full address)** — `location_label` is captured
  only by a client-side Nominatim reverse-geocode at pin-drop time, which silently no-ops
  offline. Fix is two-layered: (1) submit-time — extracted `reverseGeocode` into
  `lib/geocode.ts` and `lib/offline-submit.ts` now geocodes `lat/lng` when the queued report
  lacks a label before building the payload; (2) display fallback — new client component
  `components/reports/location-label.tsx` renders the stored label or lazy-geocodes on mount,
  used in `report-card.tsx` and `app/(citizen)/my-reports/[id]/page.tsx` (keeps server
  components light).
- [x] **No skeleton/error states for /account** — account was the only `(citizen)` route
  missing them. Added `app/(citizen)/account/loading.tsx` + `error.tsx` mirroring siblings.
- [x] **Back buttons on list pages** — new `components/back-button.tsx` (`router.back()` with
  a `/browse` fallback for deep links) added to `my-reports`, `my-feedback`, and `feedback`.
  Detail pages already had back links.
- [x] **Rate-limit: don't re-attempt, resume after limit** — `submitReport` now returns
  `retryAfter` (exact reset = oldest in-window submission + 24h) via a new optional
  `ActionResponse.retryAfter`. `QueuedReport` gains `rateLimitedUntil`. The processor skips
  rate-limited reports until the deadline and, on a rate-limit result, stores
  `rateLimitedUntil` with **no** attempt increment, no toast, no banner (fixes the "doubled
  error"); manual `handleRetry` in the panel does the same and shows a "waiting for daily
  submission limit to reset…" hint. Report auto-submits right after a slot frees.
- [x] **Offline failure → in-app notification** — new migration
  `20250806000001_add_offline_submit_failed_notification.sql` adds enum value
  `OFFLINE_SUBMIT_FAILED` + nullable `offline_queue_id text` to `notifications` (applied via
  `supabase db query --linked`, matching repo pattern; types regenerated). New server actions
  `createOfflineSubmitFailedNotification` / `deleteOfflineSubmitNotification` in
  `app/actions.ts`. Processor creates the notification when an attempt reaches
  `MAX_AUTORETRY_ATTEMPTS` (fires once) and deletes it on successful submit; panel deletes it
  on manual-retry success and discard. Bell gains the icon/href/color, refetches its list on
  Realtime events (so the item appears and disappears live), and is now also mounted in the
  mobile sheet (`public-nav.tsx`).
- [x] **Hamburger panel width + background** — `w-64` → `w-56` with a themed
  `bg-gradient-to-b from-popover via-popover to-muted/40` and the notification bell added
  inside the sheet.
- [x] **Map: all markers at all zooms** — removed `MarkerClusterGroup` and the bounds-based
  `visibleReports` viewport filter from `components/browse/browse-map.tsx`; every matching
  report renders as an individual `<Marker>` at any zoom. Kept `fitBounds`/`Reset`; the
  "Showing X of Y in this area" banner now shows the total filtered count. (Perf tradeoff with
  many reports accepted per user decision.)
- [x] **Offline reports expand toggle** — `offline-reports-panel.tsx` is collapsed by default
  with a chevron toggle that expands the list; still `null` when empty.
- [x] **Push "not configured" (ops)** — root-caused: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is inlined
  at build time and VAPID keys are gitignored; the deployed host built without them. Fix was
  env: add `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` on the host and
  redeploy. Local build verified to contain the key.
- [x] **Push verified in production** — VAPID keys configured on the Vercel deploy host, rebuilt,
  and push functionality tested end to end. No further code changes needed.
- [x] `npx tsc --noEmit` and `npm run build` pass with zero errors.

### Mobile Hamburger Console Fixes (Aug 6)

- [x] **`cannot add postgres_changes callbacks for realtime:notifications-realtime after
  subscribe()` on mobile hamburger toggle** — root cause: `createBrowserClient` returns a
  module-level singleton and `RealtimeClient.channel(topic)` dedupes by topic name, so the
  sheet `NotificationBell` (added in the QA pass) received the desktop bell's already-subscribed
  channel and its `.on("postgres_changes", …)` threw. Fixed by giving each bell instance a
  unique channel name derived from `useId()`
  (`notifications-realtime-<instanceId>`), so the two mounted bells no longer collide.
  File: `components/notification-bell.tsx`.
- [x] **Radix `DialogContent` requires a `DialogTitle` / `Description` warnings** on sheet open —
  `SheetContent` never included them; added sr-only `SheetTitle` ("Menu") and
  `SheetDescription` inside the mobile sheet. File: `components/public-nav.tsx`.
- [x] `npx tsc --noEmit` and `npm run build` pass with zero errors.

### Mobile Nav / View Toggle Polish (Aug 6)

- [x] **Notification bell beside theme toggle on mobile** — moved the bell out of the mobile sheet
  into the top bar, next to `<ThemeToggle />` (`sm:hidden` row). The desktop nav bell remains
  desktop-only (CSS-hidden but mounted on mobile; harmless duplicate subscription thanks to the
  per-instance `useId` channel name). File: `components/public-nav.tsx`.
- [x] **Hamburger panel still too wide — root cause** — `sheet.tsx`'s base width is the
  `data-[side=right]:w-3/4` variant, and the plain `w-56` override has no modifier, so
  `tailwind-merge` keeps both and the `data-side="right"` variant (higher CSS specificity)
  wins — the panel was ~75% viewport all along. Fixed with `data-[side=right]:w-40` (160px)
  so the same-variant class now overrides the base. File: `components/public-nav.tsx`.
- [x] **Solid sign-out buttons** — the destructive Button variant is `bg-destructive/10`
  (translucent) and the desktop dropdown item was red-text-on-transparent. Both sign-out
  controls are now solid red with white text (incl. explicit `dark:` overrides).
  Files: `components/public-nav.tsx`.
- [x] **View toggle layout + labels** — replaced the two icon-only `size-8` buttons with a
  full-width row of labeled `List` (LayoutGrid) / `Map` buttons, `justify-between` with `gap-3`
  (each `flex-1` on mobile, `sm:flex-none sm:justify-start` on desktop), bordered rounded pills
  with the existing accent active state. File: `components/browse/filter-bar.tsx`.
- [x] `npx tsc --noEmit` and `npm run build` pass with zero errors.

### Mobile Overlay / Popup QA (Aug 6)

- [x] **Notifications popover overflows the left on mobile** — the popover was
  `absolute right-0 w-80` (320px) anchored to the bell, but the bell now sits next to the
  hamburger (not rightmost), so on ~360px screens the panel spilled past the left edge. Now
  `fixed inset-x-4 top-16` on mobile (viewport-constrained, 1rem margins, below the 64px
  sticky header); desktop keeps the anchored `sm:absolute sm:right-0 sm:top-full sm:w-96`
  dropdown. File: `components/notification-bell.tsx`.
- [x] **Map marker popup cards too big on mobile** — Leaflet's default `maxWidth` is 300px
  (~338px with padding). Added `maxWidth={240} minWidth={200}` to `<Popup>`; the photo is now
  `w-full max-w-48` and the title `max-w-full` so content scales with the capped popup.
  File: `components/browse/browse-map.tsx`.
- [x] **Header disappears when hamburger opens after scrolling** — two separate causes, both
  fixed. (1) Overlay stacking: the sticky header is `z-[1100]` but `SheetOverlay`/`SheetContent`
  are `z-[1200]`, so the full-viewport blur/dim overlay painted on top of the header. First
  attempt added an `overlayClassName` prop to `SheetContent` (`public-nav.tsx` passes
  `inset-x-0 top-16 bottom-0`), but it FAILED: the base `SheetOverlay` class still hardcoded
  `inset-0`, and `tailwind-merge` does not treat `inset-0` as conflicting with `top-16` (both
  classes survive; `inset-0`'s `top:0` wins). Fixed by removing `inset-0` from `SheetOverlay`'s
  base and defaulting to it in `SheetContent` (`overlayClassName ?? "inset-0"`), so the override
  is applied with no leftover `inset-0` and the overlay genuinely starts below the 64px header.
  (2) Scroll lock: the real reason the header still vanished was that Radix Dialog's modal
  overlay wraps itself in `react-remove-scroll`, whose `RemoveScrollBar` injects
  `body[data-scroll-locked] { overflow: hidden !important }` while the sheet is open — with the
  body non-scrollable, `position: sticky` no longer re-sticks, so a header scrolled out of view
  stayed out of view. Fixed by toggling the header to `fixed inset-x-0 top-0` while `sheetOpen`
  is true (`public-nav.tsx` already owns that state) and back to `sticky top-0` on close; the
  body is scroll-locked anyway, so there is no scrolling conflict, and the overlay now starts
  below the 64px header so it floats undimmed. Follow-up: because `fixed` takes the header out
  of document flow, opening the sheet pushed `<main>` up by the header's 65px (64px `h-16` bar +
  1px `border-b`). Fixed by rendering `{sheetOpen && <div aria-hidden className="h-[65px]" />}`
  as a fragment sibling after the header, reserving that space only while the header is fixed.
  Files: `components/ui/sheet.tsx`, `components/public-nav.tsx`.
- [x] **Latent admin-sidebar case (noted, not fixed)** — `components/admin/admin-sidebar.tsx`
  is the only other sticky element and admin dialogs (`components/admin/bulk-action-bar.tsx`,
  `components/admin/action-buttons.tsx`) trigger the same scroll lock, so the same bug is
  possible on admin pages. Deferred per scope decision.
- [x] **Browse map too short** — the map height was aspect-ratio based
  (`aspect-[4/3] lg:aspect-[3/2]` ≈ 268px mobile / 853px desktop) in three spots plus a
  mismatched `h-[500px]` `MapSkeleton`. Switched all four to viewport height
  `h-[60vh] min-h-80 w-full lg:h-[70vh]` (mobile ~60% of screen with a 320px floor, desktop
  ~70%) so loaded / empty / loading-fallback / Suspense skeleton all render the same height.
  Files: `components/browse/browse-map.tsx`, `components/browse/browse-map-wrapper.tsx`,
  `components/reports/reports-grid-skeleton.tsx`.
- [x] `npx tsc --noEmit` and `npm run build` pass with zero errors.

### Accessibility Remediation (Units 1–4)

- [x] **Unit 1 — Links & headings** — `components/public-nav.tsx`: `aria-label="Open menu"` on mobile sheet trigger, `aria-current="page"` on active desktop/mobile nav links. `components/reports/location-label.tsx` + `comment-item.tsx`: `h1`→`h2` for inline comment/location headings nested below page-level `h1`. `app/layout.tsx` skip link (existing) confirmed.
- [x] **Unit 2 — Labels & forms** — `components/reports/report-form.tsx` (photos + category/barangay fieldsets, `aria-hidden` asterisks, `<p id=…>` error anchors + `aria-describedby`), `components/reports/comment-form.tsx` (`Label htmlFor` + `aria-describedby`), `components/reports/feedback-form.tsx` (all labels). All `PhotoUpload` instances wrapped in `<div role="group" aria-labelledby>`. `components/ui/inline-select.tsx` gained an `id?: string` prop wired to the trigger button + `aria-labelledby` so `<Label htmlFor>` associates correctly (fixes TS2322 in `report-form.tsx` / `feedback-form.tsx`).
- [x] **Unit 3 — ARIA & keyboard** — `components/reports/comment-item.tsx`: dropdown trigger gains `aria-label`, `aria-haspopup="menu"`, `aria-expanded`; menu uses `role="menu"`/`role="menuitem"`, item ids + `aria-activedescendant`, Home/End/Arrow up/down navigation, `menuRef.focus()`. `components/reports/comment-form.tsx`: hidden submit label + `aria-hidden` on visible icon button.
- [x] **Unit 4 — Semantics & headings** — `<h2>`→`<h1>` on page-level headings in 12 error/not-found pages (`submit`, `my-reports`, `my-reports/[id]`, `feedback`, `account`, `my-feedback`, `my-feedback/[id]`, `admin/feedback`, `admin/feedback/[id]` + not-found variants). Converted `<Link><Button>` nested-interactive markup to `<Button asChild><Link>` in 12 files (landing, browse, my-reports, my-reports/[id] (+edit), offline-edit, verify-email, reports/[id] (+not-found), admin reports not-found, `pagination-bar.tsx`). `components/maps/nearby-reports-layer.tsx` popup `<img alt>` now uses the report title.
- [x] Cleanups in touched files — removed unused `useRef`/`useEffect`/`typeLabels` from `feedback-form.tsx`; removed dead `Link` import from `back-button.tsx` (existing warning).
- [x] Context updated — `code-standards.md` gained an `## Accessibility` section (h1-per-page, `Button asChild` for links, label/id + `aria-labelledby` association, `aria-pressed`/`aria-label`, image `alt`); `ui-context.md` notes the `InlineSelect` `id` prop for label association; this tracker.
- [x] Verified: `npx tsc --noEmit` clean (0 errors); ESLint zero new issues on all touched files (remaining lint findings are pre-existing React Compiler rules — `set-state-in-effect`, `refs`, `purity`, `incompatible-library`, `no-img-element` — outside this scope).

### ESLint Cleanup (pre-existing findings)

- [x] **React Compiler rules (all 9 errors resolved):** `theme-toggle.tsx` + `install-prompt.tsx` hydration/display-mode guards rewritten with `useSyncExternalStore` (no more `setMounted`/`setIsStandalone` in effects); `nearby-reports-layer.tsx` replaced the `fetchIdRef` guard with a `cancelled` flag and moved the "clear reports" synchronous setState out of the effect (markers now only render when lat/lng present); `comment-list.tsx` ref updates moved from render into `useEffect`s; `location-label.tsx` derived `resolved = label ?? geocoded` instead of syncing prop→state in an effect; `offline-reports-panel.tsx` replaced `Date.now()` in render with a 30s `now` tick state; `feedback-note-editor.tsx` reset-on-prop-change via the guarded render-phase state-adjustment pattern; `carousel.tsx` retains the Embla external-API sync with a justified `eslint-disable-next-line` (required controlled-API pattern).
- [x] **`public/sw.js`** excluded from ESLint (`globalIgnores`) — generated by `@serwist/next`, not hand-maintained.
- [x] **Unused imports/params removed:** `barangayEnum` (`app/actions.ts`), `useState` (`feedback-actions.tsx`), `Database` (`my-feedback/page.tsx`), `FeedbackType` (`my-feedback/[id]/page.tsx`), dead `randomItem` (`lib/mock-data.ts`), unused `error` params destructured out of `browse/error.tsx` + `reports/[id]/error.tsx`, `account-form.tsx` `useCallback` gained missing `router` dep.
- [x] **`react-hooks/incompatible-library` (react-hook-form `watch`) resolved** in `report-form.tsx`, `feedback-form.tsx`, `admin-report-edit-form.tsx` — `watch("x")` → `useWatch<FormInput, "x">({ control, name })`, restoring compiler memoization.
- [x] **`@next/next/no-img-element`** retained with justified disables (custom regional-CDN rewrite via `getDisplayUrl` + blob object-URL previews that `next/image` cannot serve) in `report-card.tsx`, `photo-gallery.tsx`, `photo-upload.tsx`, `browse-map.tsx`.
- [x] Verified: `npx tsc --noEmit` clean, `npx eslint .` clean (0 problems), `npm run build` passes with zero errors.

### Dark-Only Theme (toggle removed)

- [x] **Dark-only palette** — `app/globals.css`: merged the old `.dark` token block into `:root` (with `color-scheme: dark`) and deleted the `.dark` block; flattened `.dark .bg-auth-gradient` into `bg-auth-gradient` using the dark gradient; status colors brightened for dark contrast (amber/green/red/blue). `@custom-variant dark` retained.
- [x] **`app/layout.tsx`** — removed `next-themes` `ThemeProvider`; `<html>` now carries `dark` class directly (dark from first paint, no flash); `viewport.themeColor` → `#2b2b2b`.
- [x] **Toggle removed everywhere** — deleted `components/theme-toggle.tsx`; removed mounts + imports from `components/public-nav.tsx` (desktop + mobile top bar), `components/admin/admin-sidebar.tsx`, `app/(auth)/layout.tsx`.
- [x] **`components/ui/sonner.tsx`** — `theme="dark"` hardcoded (dropped `useTheme`).
- [x] **Dependency removed** — `npm uninstall next-themes`.
- [x] **PWA chrome** — `public/manifest.json` `background_color` + `theme_color` → `#2b2b2b`.
- [x] Maps/popups intentionally stay light (hardcoded `.browse-popup` / `.leaflet-popup-*` white) per decision — a bright map panel on dark UI is accepted.
- [x] Context updated — `ui-context.md` Theme section rewritten (dark-only, no toggle), `app-codebase-context.md` file-org dropped `theme-toggle.tsx`, this tracker.
- [x] Verified: `npx tsc --noEmit` clean, `npx eslint .` clean (0 problems), `npm run build` passes with zero errors.

### Auth Pages — Remove Left Branding Panel

- [x] **`components/auth/auth-card.tsx`** — collapsed the 45/55 split card into a single centered form card (`mx-auto w-full max-w-md rounded-xl bg-card p-6 shadow-lg ring-1 ring-foreground/10 sm:p-8`); removed the `BrandingPanel` import + `hidden sm:block` wrapper.
- [x] **Deleted `components/auth/branding-panel.tsx`** — logo/tagline/highlights panel removed (was the only split-card consumer).
- [x] **`app/(auth)/layout.tsx`** — unchanged (already centers `AuthCard` on `bg-auth-gradient`).
- [x] **`login/page.tsx`** — mobile-only tagline strip kept as-is (`sm:hidden`).
- [x] Applies to `/login`, `/register`, `/reset-password` via the shared `AuthCard`.
- [x] Context updated — `context/feature-specs/02-auth-design.md` rewritten the `auth-card.tsx` entry (centered card, no split) and dropped the branding-panel entry; this tracker.
- [x] Verified: `npx tsc --noEmit` clean, `npx eslint .` clean (0 problems), `npm run build` passes with zero errors.
