## Issues 
  - [x] sms notification doesn't work when admin rejecting a report — fixed (2026-08-19): rejection reason was untruncated in the SMS (gateway rejected long messages); reason now sanitized/truncated to ~120 chars. SMS failures/skips are surfaced to the admin as toast warnings.
  - [x] sms notification doesn't work on bulk approved reports — fixed (2026-08-19): bulk actions were sending email+SMS serially per report and timing out on Vercel; sends are now parallelized (`Promise.allSettled`) and SMS outcomes are surfaced as warnings.
  - [x] in admin side, transparent bottom bulk selection panel covers the pagination numbers — fixed (2026-08-19): bar made fully opaque and the 4 queue pages got bottom clearance (`pb-20`).
  - [x] in admin/feedback/[id] route, it display a error : Minified React error #301 — investigated (2026-08-19): no hook-order bug found in code (lint `rules-of-hooks` passes, all route components hook-safe, routes compile + serve clean in dev). Most likely a stale service-worker/chunk race. **Action needed:** DevTools → Application → Service Workers → Unregister + "Clear storage", then hard-reload. If it reappears, reproduce logged-in under `npm run dev` for the full error.
  - 

## Suggestions
  - [x] when listing reports on admin side, it should display the latest one first also add basic filters (Ex. search bar, category and other necessary filters) — done (2026-08-19): pending now newest-first (other lists already were); added search-by-title + category + barangay filters on pending/approved/rejected/resolved via URL params.
  - [x] when clearing and marking as read a notification, it should have a spinner that indicates it clearing/marking read a report — done (2026-08-19): per-item spinner + "Clearing…" state on Clear all in the notification bell.
  - [x] in admin, add skeleton loading when navigating pages — already implemented (every admin list + detail route has a `loading.tsx`); no change needed.

## Questions
  - [x] i noticed that sms notifications sometimes take too long to recieve, why is that? — delivery speed is PhilSMS/carrier-side (not controllable from the app). App-side serial delays were removed (bulk sends now parallel); SMS never blocks the triggering action and failures/skips are now reported to the admin.
  - [x] when a citizen flag a report, i noticed that it only notify the admin not the actual user posted it? — that was by design (flags alert admins for review). Changed (2026-08-19): the report owner now also gets an in-app notification (`REPORT_FLAGGED_OWNER`) when their report is flagged. Requires applying migration `20260819000001` in the Supabase SQL editor.