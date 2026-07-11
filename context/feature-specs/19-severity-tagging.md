# Report Severity Tagging

## Design

- **Genre:** Utility — lets citizens classify the urgency of their report on a three-level scale (Minor / Urgent / Emergency) during submission. Severity is displayed as a color-coded badge on feed cards and detail pages.
- **Scope:** Severity tagging only. Report confirmations ("I saw this too") was prototyped but removed — not in scope.
- **Architecture:** A new `report_severity` enum in PostgreSQL with a `severity` column on `reports` (default `MINOR`). Zod enum validates the field on submission. No Server Actions beyond what `submitReport` already handles.

### Entry Points

| Entry | Route | Purpose |
|-------|-------|---------|
| Submit form | `/submit` | Radio group to choose severity before submitting |
| Feed card | `/browse` | Severity badge on each card (URGENT/EMERGENCY only — MINOR is hidden to reduce noise) |
| Detail page | `/reports/[id]` | Severity badge always shown |
| My reports | `/my-reports/[id]` | Severity badge on citizen's own detail view |
| Admin review | `/admin/reports/[id]` | Severity badge on admin detail view |

## Database Changes

### New Enum

```sql
CREATE TYPE report_severity AS ENUM ('MINOR', 'URGENT', 'EMERGENCY');
```

### New Column on `reports`

```sql
ALTER TABLE reports ADD COLUMN severity report_severity NOT NULL DEFAULT 'MINOR';
```

Existing rows automatically get `MINOR` via the `DEFAULT` — no backfill needed.

## Severity Badge Styles

| Level | Color | Display Rule |
|-------|-------|-------------|
| `MINOR` | Green (`text-status-approved` on green-tinted background) | Shown on detail pages only. Hidden on feed cards to reduce visual noise. |
| `URGENT` | Yellow/amber (`text-yellow-500` on yellow-tinted background) | Shown on feed cards and all detail pages. |
| `EMERGENCY` | Red (`text-status-rejected` on red-tinted background) | Shown on feed cards and all detail pages. |

## Submit Form — Radio Group (`components/reports/report-form.tsx`)

Three radio buttons displayed inline with `flex gap-3`. Each has:
- A colored checked state matching the severity level (green/yellow/red border + background)
- No default left border color — color appears only when selected
- MINOR pre-selected by default via form `defaultValues`

States:
- **Unselected:** All three options show neutral border with no tint. MINOR is pre-selected by default.
- **Selected:** The active option gets a colored border and tinted background matching its severity level.
- **Error:** Not applicable — this field is never empty (always has a default value).

### Edge Cases

- **User doesn't interact with severity:** `severity: "MINOR"` is submitted — safe, conservative default.
- **Existing reports before migration:** All get `severity = 'MINOR'` via `DEFAULT` — no data loss.
- **Category + severity confusion:** Severity is urgency (how bad), category is type (what kind). Both are shown together on badges.

## Data Flow

```
Citizen fills submit form:
  → Selects severity radio (default MINOR)
  → Form submits with severity in payload
  → Zod validates severity is a valid enum value
  → supabase insert includes severity column
  → Row saved with severity, visible in DB

Subsequent reads:
  → Any query selecting reports gets severity
  → UI renders badge based on severity value
  → Badge color class selected from severityStyles map
```

## Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/20250710000002_add_severity.sql` | Creates enum + adds column |

## Files Modified

| File | Change |
|------|--------|
| `types/database.types.ts` | Added `report_severity` enum and `severity` column |
| `lib/validations/report.ts` | Added `reportSeverityEnum` and `severity` field |
| `components/reports/report-form.tsx` | Added severity radio group with color-coded checked states |
| `components/reports/report-card.tsx` | Severity badge (URGENT/EMERGENCY only) on feed cards |
| `app/(public)/reports/[id]/page.tsx` | Severity badge on public detail |
| `app/(citizen)/my-reports/[id]/page.tsx` | Severity badge on citizen detail |
| `app/admin/reports/[id]/page.tsx` | Severity badge on admin detail |
| `lib/mock-data.ts` | Mock reports include severity |

## Implementation Status

| Item | Status |
|------|--------|
| Migration — `report_severity` enum + column | ✅ Done |
| Types — `database.types.ts` updated | ✅ Done |
| Zod — `reportSeverityEnum` in `lib/validations/report.ts` | ✅ Done |
| Form — radio group with color-coded checked states | ✅ Done |
| Feed card — severity badge (URGENT/EMERGENCY only) | ✅ Done |
| Public detail — severity badge | ✅ Done |
| Citizen detail — severity badge | ✅ Done |
| Admin detail — severity badge | ✅ Done |
| Mock data — severity populated | ✅ Done |
| `npm run build` passes with zero errors | ✅ Done |
| Data model — `data-model.md` updated | ✅ Done |
| Feature spec — `19-severity-tagging.md` | ✅ Done |

## Check When Done

- [x] Submit form shows 3 severity radio options, MINOR pre-selected
- [x] Selecting URGENT or EMERGENCY shows colored border + background
- [x] Submitted report shows correct severity badge on detail pages
- [x] Feed cards show URGENT/EMERGENCY badges; MINOR cards show no severity badge
- [x] Colors are green (minor), yellow (urgent), red (emergency)
- [x] Existing reports without severity default to MINOR
- [x] `npm run build` passes with zero errors
- [x] Feature spec written and finalized
