# Citizen Report Flagging

## Problem

Citizens are the eyes on the ground. A report may be approved and publicly visible, but the
hazard may already be fixed or the map pin may be wrong — information only the community can
provide. Currently there is no way for a citizen to signal this to admins, so the public feed
can carry stale or mislocated reports indefinitely.

## Solution

Any logged-in citizen viewing an approved/resolved report on the public detail page can flag it
as **"Already fixed"** or **"Wrong location"** with a single tap. The flag is private (never
shown publicly) and creates a record admins review on the admin report page. Admins are alerted
via an in-app notification and a **Flags** badge in the admin sidebar. Each type is an
independent toggle — tapping an active type again removes it. A citizen can have both flags on
the same report at once.

## Architecture

```
Public report detail page (/reports/[id])
    └── FlagReportButtons (client component)
          ├── renders only when logged in AND not the report owner
          ├── fetches own existing flags on mount (RLS-guarded SELECT)
          └── toggle actions (per type):
                INSERT (new) / DELETE (unflag)
                    ↓
        flagReport Server Action (app/actions.ts)
            ├── auth check
            ├── report must be APPROVED/RESOLVED
            ├── cannot flag own report
            ├── Zod validate
            └── per-type toggle: row exists → DELETE; else INSERT + on INSERT:
                  query profiles WHERE role = 'ADMIN'
                  → createNotification (REPORT_FLAGGED) for each admin
                  → createNotification (REPORT_FLAGGED_OWNER) for report.submitted_by_id
                    ↓
        report_flags table
            ├── UNIQUE (report_id, user_id, flag_type)  ← one row per type per citizen
            └── admin reads via service role (bypasses RLS)
                    ↓
        Admin sidebar "Flags" badge (count of distinct flagged report_ids)
        Admin report page "Citizen Flags" card
```

## Database

### `report_flags` table

| Column      | Type             | Notes                                        |
|-------------|------------------|----------------------------------------------|
| id          | uuid             | PK, default gen_random_uuid()                |
| report_id   | uuid             | FK → reports, NOT NULL, ON DELETE CASCADE    |
| user_id     | uuid             | FK → auth.users, NOT NULL, ON DELETE CASCADE |
| flag_type   | report_flag_type | ENUM ('ALREADY_FIXED', 'WRONG_LOCATION')     |
| created_at  | timestamptz      | default now()                                |

Constraints: `UNIQUE (report_id, user_id, flag_type)` — one flag row per citizen per report per
type (both types may be active at once). Changed from `UNIQUE (report_id, user_id)` by migration
`20250731000002`.

Index: `idx_report_flags_report_id ON report_flags(report_id)` for admin lookups.

Also adds `'REPORT_FLAGGED'` to the `notification_type` enum (admin alerting). `'REPORT_FLAGGED_OWNER'` was added later by migration `20260819000001_add_notification_flagged_owner_type.sql` to notify the report's owner that their report was flagged.

### RLS

```sql
CREATE POLICY "Citizens can insert flags"
  ON report_flags FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Citizens can read own flags"
  ON report_flags FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Added by migration 20250731000001 (toggle switch/unflag was RLS-blocked without them)
CREATE POLICY "Citizens can update own flags"
  ON report_flags FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Citizens can delete own flags"
  ON report_flags FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
```

Admins read all flags via the service role client (bypasses RLS). All citizen flag operations
go through the `flagReport` Server Action: INSERT (new flag) and DELETE (unflag) — each
governed by its matching RLS policy with the citizen's own session. There is no UPDATE branch
since flags are independent per type.

## Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/20250730000002_create_report_flags.sql` | Create enum, table, index, RLS policies; add `REPORT_FLAGGED` notification type |
| `supabase/migrations/20250731000001_add_report_flags_update_delete_policies.sql` | Add UPDATE/DELETE RLS policies (fix for toggle switch/unflag being RLS-blocked) |
| `supabase/migrations/20250731000002_allow_dual_report_flags.sql` | Drop `UNIQUE (report_id, user_id)`, add `UNIQUE (report_id, user_id, flag_type)` — allow both flags at once |
| `components/reports/flag-report-buttons.tsx` | Client toggle buttons (Already fixed / Wrong location) |
| `app/admin/flags/page.tsx` | List of reports with active flags, linking to admin report pages |

## Files Modified

| File | Change |
|------|--------|
| `types/database.types.ts` | Add `report_flag_type` enum, `report_flags` table (Row/Insert/Update), `REPORT_FLAGGED` notification value |
| `lib/validations/report.ts` | Add `flagReportSchema` (`reportId` uuid, `flagType` enum) |
| `lib/notifications.ts` | Add `REPORT_FLAGGED` to `NotificationType` union, `getMessageForType`, `getSubjectForType` |
| `app/actions.ts` | Add `flagReport` Server Action (toggle + admin in-app notification) |
| `app/(public)/reports/[id]/page.tsx` | Render `<FlagReportButtons>` below the description (logged in, not owner) |
| `components/notification-bell.tsx` | `REPORT_FLAGGED` icon (Flag), yellow tint, routes to `/admin/reports/[id]` |
| `app/admin/reports/[id]/page.tsx` | "Citizen Flags" card listing flags (type, flagger name, date) with empty state |
| `app/admin/layout.tsx` | Fetch distinct flagged report count, pass to sidebar |
| `components/admin/admin-sidebar.tsx` | Add Flags nav item, count badge + link to `/admin/flags` |

## Server Action Semantics

`flagReport(reportId: string, flagType: "ALREADY_FIXED" | "WRONG_LOCATION")`:

| Existing row (user + report + type) | Action |
|--------------------------------------|--------|
| None | INSERT, notify admins |
| Same `flag_type` | DELETE (unflag), no notification |

Each type is toggled independently — flagging "Already fixed" and "Wrong location" creates two
rows; unflagging one leaves the other intact.

## States — `FlagReportButtons`

1. **Hidden** — not logged in, or viewing own report (page decides; component never mounts)
2. **Loading** — fetching own existing flags on mount (buttons disabled)
3. **Ready** — two outline buttons visible, no active flags
4. **Active** — highlighted (default variant) per active type; both may be active at once
5. **Submitting** — the pressed button disabled with spinner; the other remains clickable
6. **Error** — toast on failure; state unchanged
7. **Unflagged** — one active flag removed, other unchanged

## Edge Cases

- **Own report** — buttons never render for the report's `submitted_by_id` (checked server-side too)
- **Report not APPROVED/RESOLVED** — Server Action rejects; public page only ever serves these two statuses anyway
- **Flag toggled off** — DELETE that type's row only; other type's row (if any) stays; admin badge count recomputed on next page load; no notification sent on unflag
- **Both flags active** — two rows (`ALREADY_FIXED` + `WRONG_LOCATION`); each toggles independently
- **User deleted** — flag cascade-deleted via FK
- **Report deleted** — flags cascade-deleted via FK
- **Multiple admins** — every admin gets an in-app notification on each new flag INSERT; notification is in-app only (no email/SMS/push per decision)
- **Report owner** — the submitter also gets an in-app `REPORT_FLAGGED_OWNER` notification (added 2026-08-19, migration `20260819000001`), routing to their report via the notification bell; in-app only
- **No admins exist** — notify loop no-ops safely
- **Double-click** — the pressed button is disabled while pending; the UNIQUE constraint makes a duplicate INSERT impossible
- **Admin reading flags** — uses service role client so RLS never hides rows; flagger name comes from a profiles join

## Implementation Status

| Item | Status |
|------|--------|
| Migration — enum + table + index + RLS + notification type | ⬜ Pending (SQL ready, apply via dashboard) |
| Types — `database.types.ts` | ✅ Done |
| Zod — `flagReportSchema` | ✅ Done |
| Notifications lib — `REPORT_FLAGGED` | ✅ Done |
| Server Action — `flagReport` toggle + admin notify | ✅ Done |
| Component — `flag-report-buttons.tsx` | ✅ Done |
| Public page integration | ✅ Done |
| Notification bell — icon, color, admin routing | ✅ Done |
| Admin report page flags card | ✅ Done |
| Admin sidebar Flags badge + `/admin/flags` page | ✅ Done |
| Context docs (progress-tracker, architecture, data-model, project-overview) | ⬜ Pending |
| `npm run build` passes with zero errors | ✅ Done |

## Check When Done

- [ ] Logged-in non-owner sees "Already fixed" / "Wrong location" buttons on `/reports/[id]`
- [ ] Anonymous visitors and the report owner see no flag buttons
- [ ] Tapping a type flags the report; tapping it again unflags (per-type toggle)
- [ ] Both types can be active at once; unflagging one leaves the other active
- [ ] Each new flag inserts an in-app notification for every admin
- [ ] Admin sidebar shows a Flags badge with the distinct flagged-report count
- [ ] Admin report page lists flags with flagger name, type, and date (or an empty state)
- [ ] `/admin/flags` lists reports with active flags linking to each admin review page
- [ ] Flags are never rendered on public pages
- [ ] `npm run build` passes with zero errors
