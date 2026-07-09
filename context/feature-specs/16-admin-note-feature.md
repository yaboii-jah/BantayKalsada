# Admin Note on Feedback Feature

## Design

- **Genre:** Utility — lightweight internal note mechanism on feedback submissions.
- **Entry point:** Admin detail page `/admin/feedback/[id]`, below feedback description and above action buttons.
- **Read path:** Citizen sees the note on `/my-feedback/[id]` as a muted callout when `admin_note` is non-null. Already implemented.
- **Write path:** Admin edits note via `FeedbackNoteEditor` client component. Server Action updates the `admin_note` column directly. No status change happens — note is independent of acknowledge/close lifecycle.
- **Notification:** In-app notification + email sent **only** when `admin_note` transitions from `null` → `string` (first-time add). Edits and clears do not notify.
- **Clearing:** Admin can remove a note entirely (set to `null`) via a "Remove note" button.

### Form Field

| Field | Type | Validation |
|-------|------|-----------|
| Admin note | Textarea | Optional, max 500 characters, nullable |

### States

**Editor (client component `FeedbackNoteEditor`):**
- **No note yet:** Empty textarea with placeholder "Add an admin note...". Save disabled until text is non-empty.
- **Note exists:** Pre-filled textarea with current note. Save enabled. "Remove note" button visible.
- **Saving:** Save button shows spinner + disabled. Remove button disabled.
- **Removing:** Remove button shows spinner + disabled. Textarea and Save button disabled.
- **Error:** `toast.error` with server error message.
- **Success:** `toast.success("Note saved")` or `toast.success("Note removed")` + `router.refresh()`.
- **Limit reached (500 chars):** Show character counter and block further input at 500.

**Edge cases:**
- **Whitespace-only note:** Trimmed server-side; treated as empty (no update / treated as remove).
- **Note unchanged:** Action still proceeds (idempotent update — no notification fires because value was not null→value).
- **Concurrent note update:** Last-write-wins. No locking. Acceptable for low-traffic admin tool.

### Server Action: `updateFeedbackNote(feedbackId, adminNote)` — `app/admin/actions.ts`

1. `verifyAdmin()` — auth + role check
2. `updateFeedbackNoteSchema.safeParse({ feedbackId, adminNote })` — Zod validation
3. Fetch feedback with submitter via `fetchFeedbackWithSubmitter`
4. If feedback not found → return error
5. Determine if this is a first-time add: `wasNull = oldNote === null && newNote !== null`
6. `adminClient.from("feedback").update({ admin_note: parsed.adminNote }).eq("id", feedbackId)`
7. If update fails → return error
8. If `wasNull` and submitter exists → fire-and-forget `sendFeedbackNotifications(feedbackId, title, submitter, "FEEDBACK_NOTE_ADDED", parsed.adminNote)`
9. Return `{ success: true }`

### Data Flow

```
Admin opens /admin/feedback/[id]
  → Sees feedback detail with read-only note (server-rendered)
  → FeedbackNoteEditor hydrates with current note (or empty)
  → Admin types note + clicks Save
    → updateFeedbackNote Server Action
      → verifyAdmin → Zod → fetch → service-role update
      → If null→value: sendFeedbackNotifications (in-app + email)
  → router.refresh() re-renders server component with new note
  → Editor re-hydrates with updated value
```

### Modified Files

| File | Change |
|------|--------|
| `supabase/migrations/20250710000001_add_feedback_note_notification_type.sql` | ADD VALUE 'FEEDBACK_NOTE_ADDED' to notification_type enum |
| `lib/validations/feedback.ts` | Add `updateFeedbackNoteSchema` |
| `lib/notifications.ts` | Add `FEEDBACK_NOTE_ADDED` to type union, messages, subjects |
| `emails/render.ts` | Add `renderFeedbackNoteAddedEmail` template |
| `lib/admin-feedback-notifications.tsx` | Extend `FeedbackNotificationType` union, add note case |
| `app/admin/actions.ts` | Add `updateFeedbackNote` Server Action |
| `components/admin/feedback-note-editor.tsx` | NEW client component |
| `app/admin/feedback/[id]/page.tsx` | Replace read-only textarea with `<FeedbackNoteEditor>` |
| `types/database.types.ts` | Add `FEEDBACK_NOTE_ADDED` to notification_type enum |

### Implementation Status

| Item | Status |
|------|--------|
| Migration: `FEEDBACK_NOTE_ADDED` enum value | ✅ Done |
| `lib/validations/feedback.ts` — `updateFeedbackNoteSchema` | ✅ Done |
| `lib/notifications.ts` — type, message, subject | ✅ Done |
| `emails/render.ts` — `renderFeedbackNoteAddedEmail` | ✅ Done |
| `lib/admin-feedback-notifications.tsx` — extended dispatcher | ✅ Done |
| `app/admin/actions.ts` — `updateFeedbackNote` Server Action | ✅ Done |
| `components/admin/feedback-note-editor.tsx` — client component | ✅ Done |
| `app/admin/feedback/[id]/page.tsx` — use `FeedbackNoteEditor` | ✅ Done |
| `components/notification-bell.tsx` — `FEEDBACK_NOTE_ADDED` icon/color | ✅ Done |
| `types/database.types.ts` — enum updated | ✅ Done |
| `context/project-overview.md` — in scope updated | ✅ Done |
| `context/architecture.md` — boundaries, storage, invariants updated | ✅ Done |
| `npm run build` passes with zero errors | ✅ Done |

### Check When Done

- [x] Admin can add a note on `/admin/feedback/[id]` via `FeedbackNoteEditor`
- [x] Admin can edit an existing note (no notification sent)
- [x] Admin can remove a note via "Remove note" button (sets to null, no notification)
- [x] Citizen sees the note on `/my-feedback/[id]` when non-null
- [x] In-app notification + email sent on first-time note add (null → string)
- [x] Character limit of 500 enforced client-side (textarea) and server-side (Zod)
- [x] Whitespace-only note treated as empty (no update)
- [x] Save/Remove buttons show pending state during transition
- [x] `npm run build` passes with zero errors
