# Security Audit (Hardening) — 9 Findings, 8 Fixed

## Design

- **Genre:** Security / Hardening. A codebase-wide audit of Bantay Kalsada's write paths,
  redirects, rate limiting, and public proxies ahead of social-media promotion, so a spike
  in real users does not coincide with a spike in spam or abuse.
- **Approach:** Review every path where user-controlled input reaches the database, a
  redirect, a paid third-party call, or a proxy, plus every rate-limited action. Nine
  findings; fixes 1–8 implemented and verified (`tsc`/`lint` clean), finding 9 (RLS
  spot-check) recorded as not independently verifiable from the migration files alone.
- **No scope/UI changes.** All fixes are server-side hardening; zero user-facing behavior
  changes beyond stricter validation messages.

### Findings & Fixes

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 1 | High | Open redirect via the `next` param in `app/auth/callback/route.ts` | `safeNextPath()` — relative same-origin paths only; `//`-prefixed, non-relative, or backslash values fall back to `/browse` |
| 2 | Medium | `flagReport` had no rate limit → a scripted user could flood admins with `REPORT_FLAGGED` notifications | 24h sliding-window count on `report_flags`, block at ≥ 30 actions, checked before the report fetch |
| 3 | Medium | `sendTestSms` had no throttle → per-message PhilSMS charges could be racked up | New `test_sms_log` table + 24h count, block at ≥ 5/day; row inserted only after a successful send |
| 4 | Medium | `clientIp()` read the **first** `x-forwarded-for` hop → a spoofed header prefix could bypass the public API rate limit | Read the **last** hop (the one appended by the trusted proxy); `x-real-ip` fallback kept |
| 5 | Low-Med | Browse `q` param interpolated raw into a PostgREST `.or("...ilike...")` filter | `sanitizeSearchTerm` (exported from `lib/api-reports.ts`) strips `% _ , . ( )` before use |
| 6 | Low | TomTom tile proxy accepted arbitrary z/x/y → abuseable as a paid-tile relay | Validate z ∈ 0–20 and x/y ∈ `0..2^z−1`, return 400 for invalid tiles |
| 7 | Low | `rejectionReason` unbounded on reject | `.max(500)` in `rejectReportSchema` |
| 8 | Low | `photo_urls` accepted any URL → could store non-Cloudinary URLs | Restrict to `https://res.cloudinary.com/` via regex in `createReportSchema` |
| 9 | Info | Notifications/profiles RLS not provable from the migration files alone | Recorded; recommended spot-check in Supabase — no code change |

### Design Decisions

- **`safeNextPath()` over a denylist.** The OAuth callback validates the `next` redirect
  against a positive rule (must start with `/` and not `//`, no backslashes) instead of
  trying to enumerate bad schemes. Denylists are fragile; the relative-path allowlist
  closes the whole class.
- **Rate-limit caps reuse existing tables where possible.** Finding 2 counts `report_flags`
  rows (RLS owner-SELECT applies to the anon-key server client, no new table). Finding 3
  needed a new `test_sms_log` table because `sendTestSms` has no natural counter and the
  table has no RLS policies — the service-role client is the only access path, matching the
  `api_request_log` / `report_activity_log` pattern.
- **Last `x-forwarded-for` hop.** When the app runs behind a trusted proxy (Vercel), the
  proxy appends the real client address as the final hop. An attacker can prepend fake hops
  to the header, so the first value is untrustworthy; the last value is the proxy's own
  observation. (`NextRequest.ip` was attempted first but does not exist on `NextRequest` in
  this Next version — caught by typecheck and removed.)
- **Cloudinary-only photo URLs are consistent with the existing flow.** All photos already
  upload through the signed Cloudinary preset (`/api/uploads/sign` → direct browser upload),
  so the DB can reasonably enforce the `res.cloudinary.com` host.
- **Schema caps are Zod-only where the DB constraint is unchanged.** Findings 7 and 8 add
  `.max(500)` / host regex in the Zod layer only; the existing DB constraints are untouched
  (no migration beyond the new `test_sms_log` table).

## User Flows

No user-facing flows changed. The behavior surface is unchanged except:

```
Open redirect attempt:  /auth/callback?next=//evil.com  (or  next=\evil.com)
  → safeNextPath() rejects → redirect to /browse (same-origin default)

Flag spam:  flagReport called 30+ times in 24h
  → "…30 flag actions in 24 hours…" error, no flag written, no admin notification

Test SMS spam:  sendTestSms called 5+ times in 24h
  → "…limit of 5 test SMS per day…" error, no PhilSMS send, no log row

XFF spoof:  X-Forwarded-For: 1.2.3.4, <real-client>
  → rate limit keyed on <real-client> (last hop)

Filter injection:  /browse?q=%25%2Cfoo  → sanitized to "foo" before ilike
Invalid tile:  /api/traffic/tiles/30/1/1 → 400 Invalid tile coordinates
```

## States

| State | Behavior |
|-------|----------|
| `next` valid relative path | Redirected to that same-origin path |
| `next` `//`-prefixed / non-relative / backslash | Fall back to `/browse` |
| `flagReport` < 30 actions in 24h | Proceeds normally |
| `flagReport` ≥ 30 actions in 24h | Rejected with friendly message |
| `sendTestSms` < 5 sends in 24h | Proceeds; log row inserted on success |
| `sendTestSms` ≥ 5 sends in 24h | Rejected with friendly message |
| `q` containing filter-reserved chars | Sanitized (reserved chars stripped) before query |
| z outside 0–20, or x/y ≥ 2^z | 400 response |

## Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/20260811000001_add_test_sms_log.sql` | `test_sms_log(id, user_id FK, created_at)`, RLS on no policies, `(user_id, created_at)` index |
| `context/feature-specs/32-security-audit.md` | This spec |

## Files Modified

| File | Change |
|------|--------|
| `app/auth/callback/route.ts` | `safeNextPath()` guards the post-OAuth redirect (finding 1) |
| `app/actions.ts` | `flagReport` 24h/30 rate limit (finding 2); `sendTestSms` 24h/5 rate limit + log insert via `createAdminClient()` (finding 3) |
| `lib/api-rate-limit.ts` | `clientIp()` reads the last `x-forwarded-for` hop (finding 4) |
| `lib/api-reports.ts` | `sanitizeSearchTerm` exported (finding 5) |
| `app/(public)/browse/page.tsx` | `q` sanitized before the `.or()` filter (finding 5) |
| `app/api/traffic/tiles/[z]/[x]/[y]/route.ts` | z/x/y bounds validation, 400 on invalid (finding 6) |
| `lib/validations/report.ts` | `rejectReportSchema.rejectionReason` `.max(500)` (finding 7); `createReportSchema.photo_urls` Cloudinary-host regex (finding 8) |
| `types/database.types.ts` | Regenerated via `supabase gen types typescript --linked` (adds `test_sms_log`) |
| `context/data-model.md` | `test_sms_log` table/relationships/indexes/RLS/business rules |
| `context/architecture.md` | Boundary notes, storage model, invariants 29–31 |
| `context/code-standards.md` | Rate-limit list, filter-sanitization rule, redirect rule |
| `context/app-codebase-context.md` | File-org annotations + Security Hardening subsection |
| `context/project-overview.md` | In Scope rate limiting + hardening |
| `context/progress-tracker.md` | Security Hardening completed section |

## Implementation Status

| Item | Status |
|------|--------|
| Finding 1 — `safeNextPath` open-redirect guard | ✅ |
| Finding 2 — `flagReport` 24h/30 limit | ✅ |
| Finding 3 — `test_sms_log` migration (applied to linked project `gvhyajfarhdbmgkloeit`) + `sendTestSms` 24h/5 limit | ✅ |
| Finding 4 — `clientIp` last-hop XFF | ✅ |
| Finding 5 — `sanitizeSearchTerm` exported + used in browse | ✅ |
| Finding 6 — tile bounds validation | ✅ |
| Finding 7 — rejection reason `.max(500)` | ✅ |
| Finding 8 — Cloudinary-only photo URLs | ✅ |
| Finding 9 — RLS spot-check | ✅ **Resolved 2026-08-18** — live DB confirmed to have the policies; baseline migration `20260818000002` now makes them reproducible from migrations. |
| `npx tsc --noEmit` clean | ✅ |
| `npm run lint` clean | ✅ |
| Docs (this spec + 5 context files + progress tracker) | ✅ |

## Check When Done

- [x] No user-controlled value reaches a redirect, filter, or paid call unsanitized
- [x] Every interactive write action has a server-side rate limit
- [x] `test_sms_log` present in the linked DB and in `types/database.types.ts`
- [x] `tsc` / `lint` clean
- [x] Context updated (this spec + data-model, architecture, code-standards, app-codebase-context, project-overview, progress-tracker)

## Known Limitations

- **Finding 9 not independently verified.** Whether `notifications` and `profiles` RLS
  policies match the documented design could not be proven from the migration files alone
  (some were created in Supabase Studio). Recommended: spot-check in the Supabase dashboard.
- **`NextRequest.ip` unavailable.** The Next.js version used does not expose `request.ip`,
  so `clientIp()` relies on the last `x-forwarded-for` hop. If the platform ever serves
  without a trusted proxy appending XFF, `x-real-ip` (or the socket address) would be the
  correct source.
- **`x-real-ip` is trust-dependent.** Both XFF and `x-real-ip` are header-supplied; they are
  only authoritative because Vercel overwrites them per-request. On a non-Vercel host the
  trusted-proxy assumption must be re-checked.
- **Zod-only caps (findings 7, 8).** The 500-char rejection reason and Cloudinary-only
  photo host are enforced at the application layer only; the DB columns remain
  unconstrained (a DB constraint would require a migration + enum/column changes).

## 2026-08-18 Remediation (Standards + Security follow-up)

Full standards + security re-audit. Findings were re-verified against the live DB and code
before fixing; two reported "findings" were corrected to reproducibility gaps.

### Re-verified findings

| # | Verdict | Detail |
|---|---------|--------|
| S1/S2 | **Not live bugs — reproducibility gap** | `profiles` + `notifications` DO have RLS enabled with the documented owner policies in the live DB (confirmed via dashboard; also logged at `progress-tracker.md` "Dashboard verifications complete"). Gap: the base schema + policies exist in **no migration**. |
| S3 | Real | `flagReport` counted live `report_flags` rows → flag→unflag→re-flag loop bypassed the 30/24h cap (finding 2's limit). |
| S4 | Real | `bulkRejectSchema.rejectionReason` (bulk reject) unbounded — finding 7's cap only covered single reject. |
| S5 | Real | `createFeedbackSchema.photo_urls` accepted arbitrary hosts — finding 8's regex only covered report submission. |
| T1 | Real | `submitReport`/`submitFeedback`/`addComment` touched the DB before Zod parsing. |
| T2 | Real | Comment actions validated inline; no shared schema. |
| T4 | Real | Inline status-color maps in admin flags/duplicate UI duplicated `ReportStatusBadge` tokens. |

### Changes

| File | Change |
|------|--------|
| `supabase/migrations/20260818000001_create_report_flag_actions.sql` (new) | `report_flag_actions(user_id, report_id, action FLAGGED/UNFLAGGED, created_at)`, index `(user_id, created_at DESC)`, RLS on/no policies — service-role only. |
| `supabase/migrations/20260818000002_baseline_profiles_notifications_rls.sql` (new) | Idempotent baseline: enums (`user_role`, `report_category`, `report_status`, `notification_type`), original `reports`/`profiles`/`notifications` definitions, `handle_new_user` + `set_updated_at` functions/triggers, the 5 owner RLS policies. Excludes `report_within_taytay_check` (references `location` from `20250713000002`) and all later-added columns. **Finding 9 closed.** |
| `app/actions.ts` | `flagReport` counts `report_flag_actions` actions (service-role) instead of live flag rows; action rows written best-effort. `submitReport`/`submitFeedback`/`addComment` parse Zod before DB queries. Comment actions use shared schemas. |
| `lib/validations/bulk.ts` | `bulkRejectSchema.rejectionReason` `.max(500)` (S4). |
| `lib/validations/feedback.ts` | `createFeedbackSchema.photo_urls` restricted to `https://res.cloudinary.com/` (S5). |
| `lib/validations/comment.ts` (new) | `addCommentSchema`, `editCommentSchema`, `deleteCommentSchema` (T2). |
| `app/admin/flags/page.tsx`, `components/admin/duplicate-manager.tsx` | Shared `ReportStatusBadge`; `DuplicateCandidate.status` retyped to the `report_status` enum (T4). |
| `app/(auth)/reset-password/page.tsx` | `window.location.href` → `router.push` (removed the only lint warning). |
| `.gitignore` | `public/sw.js` (Serwist build artifact) ignored. |
| `context/architecture.md` | `/admin` access-control claim corrected: role gate lives in `app/admin/layout.tsx` + `verifyAdmin()` in every action; the proxy only checks authentication. |
| `context/data-model.md`, `context/app-codebase-context.md` | `report_flag_actions` table + baseline provenance note; F2 flag-spam note updated. |
| `types/database.types.ts` | `report_flag_actions` added by hand (re-run `supabase gen types` when CLI available). |

### Status

- [x] Code + docs complete; `npx tsc --noEmit`, `npm run lint`, and `npm run build` all clean.
- [x] **Applied + verified** — both new migrations run in the dashboard SQL Editor on `gvhyajfarhdbmgkloeit` (2026-08-18), no errors; `report_flag_actions` present with RLS on and `count(*) = 0`.
- [ ] Deferred: T3 `as unknown as` casts, T5 oversized modules (`app/admin/actions.ts` 1140 lines, `app/actions.ts` 868), T6 hardcoded hex/token drift (`globals.css` vs `ui-context.md`).
