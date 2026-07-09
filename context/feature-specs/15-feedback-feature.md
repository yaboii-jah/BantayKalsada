# Feedback Feature Implementation

## Design (Hallmark-informed)

- **Genre:** Utility — lightweight feedback collection tool. No map, no photos, no complex interactions. A simple form with structured fields and an admin inbox for triage.
- **Placement:** Nav bar link for logged-in users ("Feedback"). Routes to `/feedback` (submit) and `/my-feedback` (history). Admin inbox at `/admin/feedback`.
- **Entry point:** Nav bar only — no footer link, no floating button. Visible when authenticated.
- **Types:** Three distinct types selected via dropdown — Bug Report, Feature Request, General. All share the same form fields.
- **Rating:** Optional 1–5 star selector. Displayed as filled/empty star icons on detail pages.
- **Status lifecycle:** `OPEN → ACKNOWLEDGED → CLOSED`. Admin advances status; user sees changes on `/my-feedback` and via in-app notification + email.
- **Rate limiting:** Max 3 feedback submissions per user per 24-hour window. Enforced server-side in the Server Action (same pattern as report rate limit).
- **Photo uploads:** Optional 0–3 photos per submission. Uses same Cloudinary flow as reports — client-side upload via `/api/uploads/sign` signed preset, CDN URLs stored in `photo_urls text[]` column. `PhotoUpload` component reused as-is. Displayed via `PhotoGallery` carousel on detail pages.
- **Colors:** All existing `--color-*` tokens preserved. No new tokens. No hardcoded hex values.
- **Type:** Inherited project tokens — Inter UI, JetBrains Mono for technical data.

### Form Fields

| Field | Type | Validation |
|-------|------|-----------|
| Type | `feedback_type` dropdown | Bug Report / Feature Request / General |
| Title | Text input | Required, 10–100 chars |
| Description | Textarea | Required, 20–2000 chars |
| Photos | PhotoUpload (reused) | Optional, 0–3, JPEG/PNG/WebP, ≤5MB each, Cloudinary |
| Rating | Star selector (1–5) | Optional |

### Status Lifecycle

| Status | Meaning | Visual |
|--------|---------|--------|
| OPEN | Newly submitted, awaiting admin review | `--status-pending` amber (reuses existing token) |
| ACKNOWLEDGED | Admin has seen it | `--status-approved` green (reuses existing token) |
| CLOSED | Admin has addressed/closed it | `--status-resolved` blue (reuses existing token) |

### List Layout (My Feedback)

- Responsive card grid matching browse feed: 1 col mobile, 2 sm, 3 lg, 4 xl, 5 2xl
- Status filter tabs row below the heading (All / Open / Acknowledged / Closed)
- Pagination with `PaginationBar` (12 per page)
- Empty state: "No feedback yet" + "Submit feedback" CTA when no filter active; "No feedback for this status" + "Clear filters" when filtered

### Detail Layout (My Feedback)

- Single centered column, `max-w-3xl`
- Status badge, type badge, title heading, description, optional rating stars, submission date
- Admin note shown as a muted callout if present
- Back link to `/my-feedback`

### Admin Inbox Layout

- Admin sidebar nav: "Feedback" item between "Resolved" and "Sign Out"
- Paginated table of all feedback via `AdminQueueTable` (reused component): submitter name, type, title, status, date
- Status filter tabs (All / Open / Acknowledged / Closed)
- Click row to navigate to `/admin/feedback/[id]`

### Admin Review Layout

- Single column, `max-w-4xl`
- Submitter name and email
- Type badge, status badge, title, description, rating stars
- Admin note textarea (optional — internal only)
- Acknowledge / Close action buttons with confirmation dialogs matching existing pattern

### States

**Submit page:**
- **Loading form:** Skeleton
- **Error:** Error boundary with retry
- **Success:** Toast "Feedback submitted!" + redirect to `/my-feedback`

**My Feedback list:**
- **Loading:** Skeleton card grid (6 card skeletons)
- **Empty (no filter):** `FileText` icon + "No feedback yet" + "Submit feedback" button
- **Empty (filtered):** `FileText` icon + "No feedback for this status" + "Clear filters" button
- **Error:** Error boundary with retry

**My Feedback detail:**
- **Loading:** Skeleton layout
- **Not found:** Custom 404 with back link
- **Error:** Error boundary with retry

**Admin inbox:**
- **Loading:** Skeleton table rows
- **Empty:** "No feedback submissions" + icon
- **Error:** Error boundary with retry

**Admin review:**
- **Loading:** Skeleton layout
- **Not found:** Custom 404 with back link
- **Acknowledge transition:** Pending state on button, success toast, redirect
- **Close transition:** Pending state on button, success toast, redirect

## Components

### New
- `app/(citizen)/feedback/page.tsx` — Server Component: feedback submission form page
- `app/(citizen)/feedback/loading.tsx` — skeleton loading state
- `app/(citizen)/feedback/error.tsx` — error boundary
- `app/(citizen)/my-feedback/page.tsx` — Server Component: list own feedback
- `app/(citizen)/my-feedback/loading.tsx` — skeleton card grid
- `app/(citizen)/my-feedback/error.tsx` — error boundary
- `app/(citizen)/my-feedback/[id]/page.tsx` — Server Component: own feedback detail
- `app/(citizen)/my-feedback/[id]/loading.tsx` — detail skeleton
- `app/(citizen)/my-feedback/[id]/error.tsx` — error boundary
- `app/(citizen)/my-feedback/[id]/not-found.tsx` — custom 404
- `app/admin/feedback/page.tsx` — admin feedback inbox
- `app/admin/feedback/loading.tsx` — skeleton table
- `app/admin/feedback/error.tsx` — error boundary
- `app/admin/feedback/[id]/page.tsx` — admin feedback review + action
- `app/admin/feedback/[id]/loading.tsx` — detail skeleton
- `app/admin/feedback/[id]/error.tsx` — error boundary
- `app/admin/feedback/[id]/not-found.tsx` — custom 404
- `components/reports/feedback-form.tsx` — client form (react-hook-form, Zod, type/rating/title/description)
- `components/reports/feedback-card.tsx` — card for feedback list (type icon, title, status badge, date)
- `components/admin/feedback-actions.tsx` — Acknowledge/Close buttons with confirmation dialogs

### Modified
- `components/public-nav.tsx` — add "Feedback" nav link for authenticated users
- `components/admin/admin-sidebar.tsx` — add "Feedback" nav item between Resolved and Sign Out
- `components/notification-bell.tsx` — handle FEEDBACK_ACKNOWLEDGED and FEEDBACK_CLOSED types (icon, route)
- `lib/notifications.ts` — extend `NotificationType`, `getMessageForType`, `getSubjectForType`, `createNotification`
- `lib/admin-notifications.tsx` — add `sendFeedbackNotifications` export
- `emails/render.ts` — add `renderFeedbackAcknowledgedEmail`, `renderFeedbackClosedEmail`
- `app/actions.ts` — add `submitFeedback` Server Action
- `app/admin/actions.ts` — add `acknowledgeFeedback`, `closeFeedback` Server Actions
- `context/progress-tracker.md` — update with completed phase

### Unchanged
- `components/ui/*` — no changes
- `app/(auth)/*` — no changes
- `app/(public)/*` — no changes
- `app/api/*` — no changes
- `lib/supabase/*` — no changes
- `lib/email.ts` — no changes
- `types/database.types.ts` — regenerate via CLI

## Notification Types

| Type | Icon | Route |
|------|------|-------|
| `FEEDBACK_ACKNOWLEDGED` | `MessageSquare` | `/my-feedback/[feedback_id]` |
| `FEEDBACK_CLOSED` | `Check` | `/my-feedback/[feedback_id]` |
| `FEEDBACK_NOTE_ADDED` | `MessageSquare` | `/my-feedback/[feedback_id]` |

## Server Actions

### `submitFeedback(formData: FeedbackFormInput)` — `app/actions.ts`

```
1. supabase.auth.getUser() — verify authenticated
2. Rate limit check: count user's feedback in last 24h — reject if >= 3
3. Zod validation on title (10–100), description (20–2000), type, rating (1–5 optional)
4. supabase.from("feedback").insert({ ... }) via server client
5. Return { success: true } or { success: false, error }
```

### `acknowledgeFeedback(feedbackId: string)` — `app/admin/actions.ts`

```
1. verifyAdmin() — auth + role check
2. Zod validation on feedbackId (uuid)
3. Fetch feedback: confirm exists and status === 'OPEN'
4. service-role update: { status: 'ACKNOWLEDGED' }
5. Fire-and-forget: sendFeedbackNotifications(feedbackId, 'FEEDBACK_ACKNOWLEDGED')
6. Return { success: true } or { success: false, error }
```

### `closeFeedback(feedbackId: string)` — `app/admin/actions.ts`

```
1. verifyAdmin() — auth + role check
2. Zod validation on feedbackId (uuid)
3. Fetch feedback: confirm exists and status !== 'CLOSED'
4. service-role update: { status: 'CLOSED' }
5. Fire-and-forget: sendFeedbackNotifications(feedbackId, 'FEEDBACK_CLOSED')
6. Return { success: true } or { success: false, error }
```

## Data Flow

```
Citizen clicks "Feedback" in nav
  → /feedback page renders FeedbackForm
  → Citizen fills type / title / description / (optional) rating
  → submitFeedback Server Action
    → auth check → rate limit check → Zod → insert
  → Success toast + redirect to /my-feedback

Admin navigates to /admin/feedback
  → Table of all feedback, filterable by status
  → Admin clicks row → /admin/feedback/[id]
  → Admin clicks "Acknowledge" or "Close"
    → acknowledgeFeedback / closeFeedback Server Action
    → verifyAdmin → Zod → service-role update → notification + email
  → Success toast + redirect to /admin/feedback

Citizen receives notification
  → Bell shows unread badge
  → Click notification → navigates to /my-feedback/[id]
  → Sees updated status + admin note if present
```

## Email Templates

### `renderFeedbackAcknowledgedEmail(citizenName, feedbackTitle)`
```
Subject: Feedback Acknowledged — Bantay Kalsada
Body: "Hi [name], your feedback '[title]' has been reviewed and acknowledged.
       Thank you for helping us improve." + [View Feedback] button
```

### `renderFeedbackClosedEmail(citizenName, feedbackTitle)`
```
Subject: Feedback Closed — Bantay Kalsada
Body: "Hi [name], your feedback '[title]' has been closed.
       The issue you raised has been addressed." + [View Feedback] button
```

## Edge Cases

- **Rate limit hit:** User sees error toast "You've reached the limit of 3 feedback submissions per day. Please try again tomorrow."
- **Empty admin_note:** Not shown on citizen detail page when null. Muted callout only renders when non-null.
- **Feedback for deleted user:** Cascade delete removes feedback rows — handles cleanup automatically.
- **Multiple rapid clicks on submit:** `useTransition` ensures serial submission. Zod blocks duplicates (no duplicate detection needed — each is a valid new submission).
- **Notification for deleted feedback:** Cascade delete on `notifications.feedback_id` FK handles cleanup.
- **Null rating:** Displayed as "No rating" muted text on detail pages, not as 0 stars.

## Implementation

1. Apply migration 1 (`20250709000001`) — non-transaction ALTER TYPE
2. Apply migration 2 (`20250709000002`) — tables, RLS, indexes
3. Regenerate Supabase types
4. Create `lib/validations/feedback.ts` — Zod schemas
5. Update `lib/notifications.ts` — extend types, messages, subjects, `createNotification`
6. Update `emails/render.ts` — add feedback email templates
7. Create `lib/admin-feedback-notifications.tsx` — notification dispatcher
8. Add `submitFeedback` to `app/actions.ts`
9. Add `acknowledgeFeedback`, `closeFeedback` to `app/admin/actions.ts`
10. Create `components/reports/feedback-form.tsx` — client form
11. Create `components/reports/feedback-card.tsx` — history card
12. Create `components/admin/feedback-actions.tsx` — action buttons
13. Create all citizen feedback pages (`/feedback`, `/my-feedback`, `/my-feedback/[id]`)
14. Create all admin feedback pages (`/admin/feedback`, `/admin/feedback/[id]`)
15. Update `components/public-nav.tsx` — add nav link
16. Update `components/admin/admin-sidebar.tsx` — add sidebar nav item
17. Update `components/notification-bell.tsx` — handle feedback types
18. Update `context/project-overview.md` — add to In Scope
19. Update `context/data-model.md` — add feedback table
20. Update `context/architecture.md` — add feedback boundaries
21. Update `context/progress-tracker.md`

## Implementation Status

| Item | Status |
|---|---|
| Migration 1: notification_type enum values | ✅ Done |
| Migration 2: feedback tables, RLS, indexes | ✅ Done |
| Migration 3: photo_urls column (20250709000003) | ✅ Done |
| `lib/validations/feedback.ts` — Zod schemas | ✅ Done |
| `lib/notifications.ts` — feedback types | ✅ Done |
| `emails/render.ts` — feedback templates | ✅ Done |
| `lib/admin-feedback-notifications.tsx` — notification dispatcher | ✅ Done |
| `app/actions.ts` — `submitFeedback` | ✅ Done |
| `app/admin/actions.ts` — `acknowledgeFeedback`, `closeFeedback` | ✅ Done |
| `components/reports/feedback-form.tsx` | ✅ Done |
| `components/reports/feedback-card.tsx` | ✅ Done |
| `components/admin/feedback-actions.tsx` | ✅ Done |
| Citizen feedback pages | ✅ Done |
| Admin feedback pages | ✅ Done |
| `public-nav.tsx` — nav link | ✅ Done |
| `admin-sidebar.tsx` — sidebar item | ✅ Done |
| `notification-bell.tsx` — feedback type handling | ✅ Done |
| Context files updated | ✅ Done |
| `npm run build` passes | ✅ Done |

## Check When Done

- [x] Any logged-in user can submit feedback via `/feedback`
- [x] Rate limit of 3/day enforced server-side
- [x] User sees own feedback on `/my-feedback` with status badges
- [x] Admin sees all feedback on `/admin/feedback`
- [x] Admin can Acknowledge (OPEN → ACKNOWLEDGED) and Close (any → CLOSED)
- [x] In-app notification + email sent on status change
- [x] Notification bell navigates to `/my-feedback/[id]` for feedback notifications
- [x] Nav bar shows "Feedback" link for authenticated users
- [x] Admin sidebar shows "Feedback" nav item
- [x] All states covered: loading, empty, error, not-found
- [x] `npm run build` passes with zero errors
- [x] No hardcoded hex values — all tokens used
