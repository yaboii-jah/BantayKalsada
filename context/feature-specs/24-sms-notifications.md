# SMS Notifications via PhilSMS

## Design

- **Genre:** Utility — silent background dispatch alongside email. Citizens opt in via Account Settings. SMS is always non-blocking: failures are logged, status transitions never roll back.
- **Provider:** PhilSMS REST API v3. Chosen over Semaphore (requires TIN). Configurable API base URL via `PHILSMS_API_BASE` env var to support both old (`app.philsms.com`) and new (`dashboard.philsms.com`) dashboards.
- **Scope:** Only critical report status events — approve, reject, resolve. No SMS on feedback or comments.
- **Independence:** Email and SMS are fully independent — each wrapped in its own try/catch so one failure never blocks the other.
- **SMS message style:** Ultra-concise plain text (no branding, no links — SMS length limits). Messages like: *"Bantay Kalsada: Your report 'Sirang Ilaw' has been approved."*

### Entry Points

| Entry | Route | Purpose |
|-------|-------|---------|
| Phone input + SMS toggle | `/account` | Citizen sets phone number and opts in |
| Send Test SMS button | `/account` | Manual test of PhilSMS integration |
| Admin actions | `/admin/*` | Approve/reject/resolve triggers conditional SMS |
| Diagnostic endpoint | `GET /api/sms/diagnose` | Admin-only token/balance verification |

### Data Flow

```
Admin approves/rejects/resolves a report:
  → Server Action updates report status
  → sendReportNotifications() called:
    → Email sent via Brevo (try/catch)
    → If submitter has phone + sms_notifications:
      → sendSMS() called
      → Up to 3 attempts with 1s delay
      → On failure: console.error(smsError) — never thrown

Citizen sets phone on /account:
  → updateProfileSettings Server Action
  → Zod validates PH phone format
  → Normalized to +63... saved to profiles.phone

Citizen clicks "Send Test SMS":
  → sendTestSms Server Action
  → Reads phone from profile
  → Sends "This is a test SMS from Bantay Kalsada."
  → Returns success/error to client toast
```

## Requirements

1. **PhilSMS API only** — no fallback provider in v1.
2. **Phone number stored normalized** — always saved as `+639XXXXXXXXX` format.
3. **SMS toggle off by default** — citizens must explicitly opt in.
4. **SMS sent only after email** — email dispatches first, SMS is conditional on phone + toggle.
5. **No SMS on feedback/comments** — only approve, reject, resolve.
6. **Configurable API base URL** — `PHILSMS_API_BASE` env var defaults to `https://app.philsms.com` but can be set to `https://dashboard.philsms.com` for new PhilSMS accounts.
7. **Diagnostic endpoint** — admin-only `GET /api/sms/diagnose` that probes both old and new API domains with the configured token, returning the `/v3/me` profile and `/v3/balance` credit info from each.

## States

| State | Behaviour |
|-------|-----------|
| Phone empty + SMS off | No SMS sent on status change |
| Phone set + SMS on | SMS dispatched after email on approve/reject/resolve |
| SMS API failure (3 retries exhausted) | Error logged to console, status transition proceeds |
| PhilSMS not configured (missing token/sender) | SMS silently skipped, no crash |
| Test SMS sent | `/account` shows loading → success toast or error toast |
| Diagnostic loaded | Returns token preview, old/new site probe results side by side |

## Edge Cases

- **Trailing whitespace in env var:** `token.trim()` applied before every API request.
- **Old vs new dashboard:** `PHILSMS_API_BASE` defaults to `app.philsms.com`; set to `dashboard.philsms.com` for new accounts. The diagnostic endpoint probes both.
- **Phone number cleaning:** `normalizePhoneNumber()` handles all PH formats (`09XXXXXXXXX`, `9XXXXXXXXX`, `+639XXXXXXXXX`) → normalized to `+639XXXXXXXXX`. Invalid numbers return `null` and SMS is skipped.
- **SMS only sent when citizen has valid phone + SMS toggle both truthy:** Both conditions checked server-side in `sendReportNotifications()`.
- **Rate limiting:** None imposed by the application (PhilSMS may have its own account-level limits).
- **Rejection reason in SMS:** Omitted from SMS (space constrained; full reason sent via email).
- **Bulk actions:** Each report in the batch independently checks phone/toggle and dispatches SMS.

## Files Created

| File | Purpose |
|------|---------|
| `lib/sms.ts` | PhilSMS client: `sendSMS()`, `normalizePhoneNumber()`, `philsmsEndpoint()`, 3-attempt retry |
| `app/api/sms/diagnose/route.ts` | Admin-only diagnostic endpoint probing both `app.philsms.com` and `dashboard.philsms.com` |

## Files Modified

| File | Change |
|------|--------|
| `lib/notifications.ts` | Added `getSmsMessageForType()` for SMS-friendly messages (approved, rejected, resolved) |
| `lib/admin-notifications.tsx` | Added `phone`/`sms_notifications` to `fetchReportWithSubmitter` select; `sendReportNotifications` now conditionally dispatches SMS after email; returns `{ smsError? }` |
| `lib/validations/profile.ts` | Added `phoneSchema` and `updateProfileSettingsSchema` with PH mobile regex pattern |
| `app/actions.ts` | Added `updateProfileSettings` (saves phone + toggle), `sendTestSms` Server Actions |
| `app/(citizen)/account/page.tsx` | Added profile settings form section |
| `app/(citizen)/account/account-form.tsx` | Added phone input with PH mask, SMS toggle switch, "Send Test SMS" button with loading state |
| `components/public-nav.tsx` | Added "Account Settings" link in desktop dropdown and mobile sheet |
| `app/admin/actions.ts` | All 6 callers of `sendReportNotifications` (`approveReport`, `rejectReport`, `resolveReport`, `bulkApproveReports`, `bulkRejectReports`, `bulkResolveReports`) now `await` the result and log `smsError` to console instead of fire-and-forget `.catch()` |

## Implementation Status

| Item | Status |
|------|--------|
| Migration: `phone` (text, nullable), `sms_notifications` (boolean, default false) on `profiles` | ✅ Done |
| Database types: updated profiles Row/Insert/Update in `types/database.types.ts` | ✅ Done |
| `lib/sms.ts` — `sendSMS()`, `normalizePhoneNumber()`, `philsmsEndpoint()`, 3-attempt retry | ✅ Done |
| `lib/sms.ts` — `token.trim()` to strip accidental whitespace from env var | ✅ Done |
| `lib/sms.ts` — `PHILSMS_ENDPOINT` replaced with `PHILSMS_API_BASE` env var (default `https://app.philsms.com`) | ✅ Done |
| `lib/notifications.ts` — `getSmsMessageForType()` for SMS-friendly messages | ✅ Done |
| Zod schema — `updateProfileSettingsSchema` with PH phone regex | ✅ Done |
| `updateProfileSettings` Server Action — normalizes phone, saves to profiles | ✅ Done |
| `sendTestSms` Server Action — sends test message to citizen's phone | ✅ Done |
| Account settings page — `account-form.tsx` with phone input + SMS toggle + test button | ✅ Done |
| Nav links — "Account Settings" added to desktop dropdown and mobile sheet | ✅ Done |
| `lib/admin-notifications.tsx` — fetches phone/sms_notifications, dispatches SMS after email, returns `{ smsError? }` | ✅ Done |
| Admin actions — all 6 callers `await` + handle `smsError` | ✅ Done |
| Email + SMS fully independent — each wrapped in try/catch | ✅ Done |
| `GET /api/sms/diagnose` — probes both `app.philsms.com` and `dashboard.philsms.com` `/v3/me` and `/v3/balance` | ✅ Done |
| SMS confirmed working — new dashboard + token + `PHILSMS_API_BASE` | ✅ Done |
| `npm run build` passes with zero errors | ✅ Done |

## Check When Done

- [x] `.env.local` has `PHILSMS_API_TOKEN`, `PHILSMS_SENDER_ID`, `PHILSMS_API_BASE` configured
- [x] Citizens can set their Philippine mobile number on `/account`
- [x] Citizens can toggle SMS notifications on/off on `/account`
- [x] "Send Test SMS" button sends a test message and shows success/error toast
- [x] Admin approve sends SMS to opted-in citizens with valid phone
- [x] Admin reject sends SMS (message only, no rejection reason)
- [x] Admin resolve sends SMS
- [x] Bulk approve/reject/resolve also send SMS per report
- [x] SMS failure (all 3 retries) does not block status transition or email
- [x] Missing phone or SMS toggle off = no SMS sent (silent skip)
- [x] `GET /api/sms/diagnose` works for admins — shows old and new site probe results
- [x] `PHILSMS_API_BASE` env var correctly switches between old and new API domains
- [x] `npm run build` passes with zero errors
