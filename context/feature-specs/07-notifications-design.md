# Email & In-App Notifications Implementation

## Design (Hallmark-informed)

- **Genre:** Utility — silent background service. No UI except the email inbox. Notifications are written to the database for a future v1.1 notification center (bell icon, dropdown, mark-as-read).
- **Email style:** Simple text-based HTML with clean inline styles. No heavy branding, no decorative imagery. Prioritizes deliverability over polish.
- **In-app notifications:** Inserted alongside each email into the `notifications` table (already designed in `data-model.md` and live on the database). The `is_read` column is left at `false` — toggled by v1.1 UI.
- **Colors:** No new CSS tokens. Email uses inline `#1D4ED8` (primary blue) for buttons, `#0F172A` for body text, `#64748B` for muted text, `#FEF2F2`/`#FECACA`/`#991B1B` for rejection reason callout.
- **Type:** System fonts (Arial/Helvetica) in email HTML — no web fonts. Email clients strip or block custom fonts.

### Email Templates

Three template functions in `emails/render.ts`, each returning a full HTML document wrapped in a shared `baseLayout()`:

1. **Approved** — "Your report has been approved" + title + "View Report" button linking to `/reports/[id]`
2. **Rejected** — "Your report has been rejected" + rejection reason in a red-tinted callout box + "View Details" button linking to `/my-reports/[id]`
3. **Resolved** — "Your report has been marked as resolved" + title + "View Report" button linking to `/reports/[id]`

`baseLayout()` provides: header ("Bantay Kalsada" in primary blue), white card body, footer with automated notification disclaimer.

### Brevo Integration

- **SDK:** `@getbrevo/brevo` (v5) installed as a dependency
- **Client:** `lib/email.ts` — lazy singleton initialized from `BREVO_API_KEY` env var, exports `sendStatusEmail()`
- **Sender:** `BREVO_SENDER_EMAIL` env var (`jahmelldorias17@gmail.com`), display name "Bantay Kalsada"

### In-App Notifications

- `lib/notifications.ts` exports:
  - `createNotification({ userId, reportId, type, message })` — inserts a row using the service role client
  - `getMessageForType(type, reportTitle)` — returns user-facing message string
  - `getSubjectForType(type)` — returns email subject line

### Admin Action Flow

Each Server Action in `app/admin/actions.ts` follows this sequence:

1. **Authenticate** — `supabase.auth.getUser()` via server client
2. **Authorize** — `profiles.role === "ADMIN"` check (extracted into `verifyAdmin()` helper)
3. **Validate** — Zod input parsing
4. **Fetch** — `fetchReportWithSubmitter()` reads report status + title + submitter profile via service role
5. **Mutate** — Status update via service role client (the core operation — if this fails, return error immediately)
6. **Notify** — Fire-and-forget `sendReportNotifications()`:
   - Calls `createNotification()` to insert a notification row
   - Calls the appropriate `render*Email()` function for HTML
   - Calls `sendStatusEmail()` to deliver via Brevo
7. **Respond** — `{ success: true }`

Email/notification failures are caught with `.catch()` and logged but never roll back the status update. Report moderation is never blocked by a transient email delivery issue.

### Lib & Module Design

- `lib/email.ts` (`.ts`) — Brevo client + send function. No JSX. Imported by `lib/admin-notifications.tsx`.
- `lib/notifications.ts` (`.ts`) — Pure data logic. No JSX.
- `lib/admin-notifications.tsx` (`.tsx`) — Orchestration layer. Contains `fetchReportWithSubmitter()` and `sendReportNotifications()`. Uses `.tsx` extension because it imports email template functions that contain JSX.
- `emails/render.ts` (`.ts`) — Template string HTML generators. No JSX — builds HTML via string interpolation. Circumvents the Next.js App Router restriction on `react-dom/server` imports.

### States

**Email delivery:**
- **Success:** Email sent via Brevo API; no user-visible feedback needed
- **Failure (transient):** Caught + logged via `.catch()` — status update is NOT rolled back
- **Failure (missing env):** `sendStatusEmail()` throws on missing `BREVO_API_KEY` — caught by the action's outer try/catch, returned as error

**Notification insert:**
- **Success:** Row inserted into `notifications` table
- **Failure:** `console.error()` logged — not propagated to the admin UI

## Components

### New
- `lib/email.ts` — Brevo client wrapper (`sendStatusEmail`)
- `lib/notifications.ts` — notification creation helpers (`createNotification`, `getMessageForType`, `getSubjectForType`)
- `lib/admin-notifications.tsx` — report submitter lookup + notification/email dispatch (`fetchReportWithSubmitter`, `sendReportNotifications`)

### Files Created
- `emails/render.ts` — template string email HTML generators (`renderApprovedEmail`, `renderRejectedEmail`, `renderResolvedEmail`, `baseLayout`)

### Modified
- `app/admin/actions.ts` — added notification + email dispatch to `approveReport`, `rejectReport`, `resolveReport`; extracted `verifyAdmin()` helper; added `fetchReportWithSubmitter()` usage
- `context/architecture.md` — fixed "Resend client" → "Brevo client"; added `lib/notifications.ts` and `lib/admin-notifications.tsx` to the lib directory listing
- `context/ai-workflow-rules.md` — fixed "Resend integrated" → "Brevo integrated" in feature unit sequence
- `context/progress-tracker.md` — updated with completed phase

## Implementation

1. Create `lib/email.ts` — Brevo client singleton, `sendStatusEmail()` function
2. Create `lib/notifications.ts` — `createNotification()`, `getMessageForType()`, `getSubjectForType()`
3. Create `lib/admin-notifications.tsx` — `fetchReportWithSubmitter()`, `sendReportNotifications()`
4. Create `emails/render.ts` — `baseLayout()`, `renderApprovedEmail()`, `renderRejectedEmail()`, `renderResolvedEmail()`
5. Update `app/admin/actions.ts` — add `verifyAdmin()` helper; wire notification + email into all three actions
6. Fix context docs: `architecture.md` (Resend → Brevo), `ai-workflow-rules.md` (Resend → Brevo)
7. Update `context/progress-tracker.md`
8. Write `context/feature-specs/07-notifications-design.md`
9. Verify `npm run build` passes with zero errors

## Implementation Status

| Item | Status |
|---|---|
| `lib/email.ts` — Brevo client singleton + `sendStatusEmail` | ✅ Built |
| `lib/notifications.ts` — `createNotification`, message/subject helpers | ✅ Built |
| `lib/admin-notifications.tsx` — submitter lookup + notification/email dispatch | ✅ Built |
| `emails/render.ts` — `baseLayout`, `renderApprovedEmail`, `renderRejectedEmail`, `renderResolvedEmail` | ✅ Built |
| `app/admin/actions.ts` — notification + email wired into `approveReport` | ✅ Built |
| `app/admin/actions.ts` — notification + email wired into `rejectReport` | ✅ Built |
| `app/admin/actions.ts` — notification + email wired into `resolveReport` | ✅ Built |
| `app/admin/actions.ts` — `verifyAdmin()` extracted | ✅ Built |
| `context/architecture.md` — Brevo fix applied | ✅ Built |
| `context/ai-workflow-rules.md` — Brevo fix applied | ✅ Built |
| `context/progress-tracker.md` — updated | ✅ Built |
| `context/feature-specs/07-notifications-design.md` — written | ✅ Built |
| `npm run build` passes with zero errors | ✅ Built |

## Check When Done

- [x] `BREVO_API_KEY` and `BREVO_SENDER_EMAIL` configured in `.env.local`
- [x] `@getbrevo/brevo` installed as dependency
- [x] `lib/email.ts` creates a lazy Brevo client singleton
- [x] `sendStatusEmail()` sends via `sendTransacEmail()` with correct sender/subject/body
- [x] All three email templates render valid HTML with inline styles
- [x] `renderRejectedEmail` includes rejection reason in a callout box
- [x] `createNotification()` inserts rows into the `notifications` table using service role client
- [x] `approveReport` creates notification + sends email after status update
- [x] `rejectReport` creates notification + sends email after status update
- [x] `resolveReport` creates notification + sends email after status update
- [x] Email/notification failure does not roll back the status update (fire-and-forget)
- [x] `verifyAdmin()` eliminates duplicate auth/role checks across all three actions
- [x] `fetchReportWithSubmitter()` fetches report status + title + submitter profile in one call
- [x] No `react-dom/server` imports — template strings avoid App Router restriction
- [x] `lib/admin-notifications.tsx` uses `.tsx` extension for JSX compatibility
- [x] No hardcoded secrets or `console.log` in committed code
- [x] `npm run build` passes with zero errors

## Files Added / Modified

### `lib/email.ts` — Brevo client wrapper

Exports `sendStatusEmail({ to, toName, subject, htmlContent })`. Initializes `BrevoClient` lazily from `BREVO_API_KEY` env var and caches it as a module-level singleton. Calls `client.transactionalEmails.sendTransacEmail()` with sender name "Bantay Kalsada" and the configured sender email.

The singleton pattern is safe here because:
- `BREVO_API_KEY` is a server-only env var never exposed to the browser
- The module is only imported server-side (from Server Actions)
- No per-request state is stored — the API key is static

### `lib/notifications.ts` — Shared notification utility

Pure data helpers with no JSX:

- `createNotification({ userId, reportId, type, message })` — calls `adminClient.from("notifications").insert(...)` using the service role client. Errors are caught and logged (not propagated) since they should never block the status update.
- `getMessageForType(type, reportTitle)` — returns `"Your report "..." has been approved.` etc.
- `getSubjectForType(type)` — returns `"Report Approved — Bantay Kalsada"` etc.
- `NotificationType` — exported type alias: `ReportNotificationType | FeedbackNotificationType` where `ReportNotificationType` = `"REPORT_APPROVED" | "REPORT_REJECTED" | "REPORT_RESOLVED"` and `FeedbackNotificationType` = `"FEEDBACK_ACKNOWLEDGED" | "FEEDBACK_CLOSED" | "FEEDBACK_NOTE_ADDED"`

### `lib/admin-notifications.tsx` — Report submitter lookup + dispatch

Orchestration layer that bridges the admin actions with the notification and email subsystems. Uses `.tsx` extension because it imports email template functions (which contain JSX):

- `fetchReportWithSubmitter(reportId)` — uses service role client to query `reports` (status, title, submitted_by_id) and `profiles` (id, email, full_name) of the submitter. Returns `ReportWithSubmitter | null`.
- `sendReportNotifications(reportId, reportTitle, submitter, type, rejectionReason?)` — calls `createNotification`, renders the appropriate email HTML, calls `sendStatusEmail`.

### `emails/render.ts` — Template string email HTML generators

Five functions, all using string interpolation — no JSX. This avoids the Next.js App Router restriction on `react-dom/server` imports:

- `baseLayout(content)` — wraps content in a full HTML document with header, white card body, and footer
- `button(href, label)` — returns an `<a>` tag styled as a blue button
- `renderApprovedEmail(citizenName, reportTitle, reportId)` — approval email content
- `renderRejectedEmail(citizenName, reportTitle, reportId, rejectionReason)` — rejection email with reason callout
- `renderResolvedEmail(citizenName, reportTitle, reportId)` — resolution email content

### `app/admin/actions.ts` — Updated admin Server Actions

Three changes:

1. **`verifyAdmin()` extracted** — shared helper that authenticates via `supabase.auth.getUser()` and checks `profiles.role === "ADMIN"`. Returns a discriminated union type `AdminAuthResult` for clean TypeScript narrowing.

2. **`fetchReportWithSubmitter()` usage** — all three actions now fetch report + submitter info before the status update, giving them the data needed for notifications.

3. **Notification + email dispatch** — after each status update succeeds, a fire-and-forget `.catch()` call to `sendReportNotifications()` sends the email and inserts the notification row. Failure is logged but never blocks the response.
