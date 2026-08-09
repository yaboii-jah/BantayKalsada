# Admin Trust Features (Tier 3)

## Problem

Admins can moderate reports but have no durable record of *what* happened to a
report over time, no way to correct errors after approval (a typo or bad photo
is frozen unless the report is rejected), and no way to consolidate duplicate
submissions — the same pothole reported three times shows up three times on the
public feed, and resolving one leaves the others stale.

## Solution

Four Tier-3 features, all server-side enforced with the service-role client:

1. **Admin report editing** — an admin can edit a report's editable fields
   (title, description, category, severity, barangay, photos, pin) after the
   citizen submitted it. The submitter gets an in-app `REPORT_EDITED`
   notification (no email/SMS).
2. **Activity log / audit trail** — a `report_activity_log` table records every
   meaningful lifecycle event (submit, edit, approve, reject, resolve, duplicate
   link/unlink, merge, comment removal). Written via the service-role client.
3. **Report lifecycle timeline** — a read-only timeline UI (on the admin review
   page and the citizen detail page) rendering the activity log in
   chronological order, falling back to report timestamps for legacy reports
   that predate the log.
4. **Duplicate linking / merge** — an admin can mark one report as a duplicate
   of another (canonical), or fully merge a duplicate into the canonical report
   (moving comments + flags, deduplicating photos capped at 3). The duplicate is
   **retired via `duplicate_of_id`, never hard-deleted**. Duplicate reports show
   a banner on the public/citizen/admin detail pages.

## Architecture

```
Admin review page (/admin/reports/[id])
  ├─ ReportTimeline (server)          → report_activity_log (service-role)
  ├─ DuplicateManager (client)        → linkDuplicate / unlinkDuplicate / mergeReports / findDuplicateCandidates
  └─ Edit report button               → /admin/reports/[id]/edit
       └─ AdminReportEditForm (client) → editReport(reportId, CreateReportInput)

Duplicate banner (public / citizen / admin detail pages)
  └─ reads reports.duplicate_of_id → links to canonical report detail page
```

Audit logging is *inside* the Server Actions — a lifecycle event cannot happen
without its log row (submit → `SUBMITTED`, edit → `EDITED`, approve →
`APPROVED`, reject → `REJECTED` + reason, resolve → `RESOLVED` + notes, link →
`DUPLICATE_LINKED`, merge → `MERGED` on both reports, comment removal →
`COMMENT_REMOVED`).

## Database

### Migration `20260809000001_create_report_activity_log.sql`

Enum `report_activity_action` (`SUBMITTED`, `EDITED`, `APPROVED`, `REJECTED`,
`RESOLVED`, `DUPLICATE_LINKED`, `MERGED`, `COMMENT_REMOVED`) and table:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| report_id | uuid | FK → reports, ON DELETE CASCADE |
| actor_id | uuid | FK → auth.users, ON DELETE SET NULL |
| action | report_activity_action | NOT NULL |
| detail | jsonb | Free-form context (changed fields, reason, notes, canonical id) |
| created_at | timestamptz | default now() |

RLS enabled with **no policies** — service-role only, consistent with
`api_request_log`. Index `(report_id, created_at)`.

### Migration `20260809000002_add_report_duplicate_of.sql`

`reports.duplicate_of_id uuid NULL REFERENCES reports(id) ON DELETE SET NULL` +
index `(report_id)`.

### Migration `20260809000003_add_report_edited_notification.sql`

`ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'REPORT_EDITED';` — must
be applied **outside a transaction**. In-app only.

## Files

| File | Role |
|------|------|
| `supabase/migrations/20260809000001_create_report_activity_log.sql` | Audit log table + enum |
| `supabase/migrations/20260809000002_add_report_duplicate_of.sql` | `reports.duplicate_of_id` |
| `supabase/migrations/20260809000003_add_report_edited_notification.sql` | `REPORT_EDITED` notification type |
| `lib/report-activity.ts` | `logReportActivity({ reportId, actorId, action, detail? })` via `createAdminClient()` |
| `app/admin/actions.ts` | `editReport`, `linkDuplicate`, `unlinkDuplicate`, `mergeReports`, `findDuplicateCandidates`; audit wiring on approve/reject/resolve/bulk + `removeComment` |
| `app/actions.ts` | Audit wiring on `submitReport` (SUBMITTED) and `updateReport` (EDITED with `changedFields`) |
| `app/admin/reports/[id]/edit/page.tsx` | Admin edit page |
| `components/admin/admin-report-edit-form.tsx` | RHF + zod edit form (reuses PhotoUpload / LocationPickerWrapper / InlineSelect) |
| `components/admin/duplicate-manager.tsx` | Link / unlink / merge / candidate search UI on the admin review page |
| `components/reports/duplicate-banner.tsx` | Banner on reports whose `duplicate_of_id` is set |
| `components/reports/report-timeline.tsx` | Chronological lifecycle timeline (server component) |
| `lib/notifications.ts` | `EditedNotificationType` + message/subject |
| `components/notification-bell.tsx` | `PenLine` icon for `REPORT_EDITED` |

## Invariants

- **Every lifecycle event has an audit row.** Audit logging runs inside the
  Server Action, after the write succeeds, so success and audit trail are atomic
  in practice.
- **Duplicate reports are never hard-deleted.** Merge retires the duplicate by
  setting `duplicate_of_id`; comments/flags/photos are reassigned to the
  canonical report first.
- **Boundary re-check on edit only when coordinates change.** `editReport`
  calls `is_within_boundary` only if `latitude`/`longitude` differ, so admin
  typo fixes don't trip the RPC unnecessarily; the DB trigger
  (`trg_reports_location_boundary`) still guards every location write.
- **`REPORT_EDITED` is in-app only** — no email, no SMS.
- **Bulk actions log per-report rows** (`bulkApproveReports` etc.), one `APPROVED`
  / `REJECTED` / `RESOLVED` row per affected report.
