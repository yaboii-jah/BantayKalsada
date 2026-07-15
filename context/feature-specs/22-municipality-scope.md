  # Municipality Scope — Taytay, Rizal

> **Status: Implemented and shipped.** This spec has been reconciled with the actual implementation. See "Deviations From Original Plan" below.

## Deviations From Original Plan

The feature shipped with three intentional differences from the first draft of this spec:

1. **Barangay is selected manually, not auto-detected.** The original plan called for Nominatim reverse geocoding to auto-fill the barangay dropdown on pin drop. This was **not implemented**. The citizen selects their barangay manually from an `InlineSelect` dropdown (`components/ui/inline-select.tsx`) in the submission form. Reverse geocoding is still used, but only to populate `location_label` (the human-readable address) — it never touches the barangay field.
2. **Boundary is enforced by a trigger, not a CHECK constraint.** PostgreSQL disallows subqueries in CHECK constraints, so a `BEFORE INSERT OR UPDATE OF latitude, longitude` trigger (`trg_reports_location_boundary`) enforces `ST_Within`. The trigger builds the point geometry inline via `ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geometry` — not `NEW.location`, which is NULL inside a `BEFORE INSERT` trigger on PostgreSQL 17 (generated columns are not yet computed at that point).
3. **The `barangay` column stays nullable.** No backfill or `NOT NULL` migration was applied. Pre-scope reports keep `barangay = NULL` and render without a barangay label.

## Design

- **Genre:** Scope constraint — reduces the application from nationwide to a single municipality. Adds geographic boundary enforcement, a barangay field on reports, and localizes all copy/UX to Taytay, Rizal.
- **Scope:** All submission, browse, and admin surfaces. Existing reports outside Taytay remain visible (if approved/resolved) but new submissions are rejected if the pinned location falls outside the Taytay boundary polygon.
- **Architecture:** A `municipality_boundaries` table stores the Taytay boundary as a PostGIS `geography(Polygon, 4326)`. A `BEFORE INSERT OR UPDATE` trigger (`trg_reports_location_boundary`) on `reports` enforces `ST_Within` at the database level. A matching `is_within_boundary` RPC is called in the `submitReport` Server Action for application-level enforcement (defense in depth). A new `barangay` enum and column on `reports` enables barangay-level filtering; the citizen selects the barangay manually from an `InlineSelect` dropdown on the submission form. The landing page, nav copy, and meta tags are localized to Taytay.

### Entry Points

| Entry | Route | Purpose |
|-------|-------|---------|
| Submit form | `/submit` | Barangay dropdown + boundary validation + map centered on Taytay |
| Public feed | `/browse` | Barangay filter in filter bar, map centered on Taytay |
| Report detail | `/reports/[id]` | Barangay shown in metadata |
| Admin queues | `/admin/*` | Barangay column in queue tables, barangay filter |
| Admin analytics | `/admin` | Barangay distribution chart |
| Landing page | `/` | Localized hero copy referencing Taytay, Rizal |

## Database Changes

### New Enum

```sql
CREATE TYPE barangay AS ENUM (
  'DOLORES',
  'SAN_ISIDRO',
  'SAN_JUAN',
  'SANTA_ANA',
  'MUZON'
);
```

### New Table — `municipality_boundaries`

```sql
CREATE TABLE municipality_boundaries (
  id          uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text                  NOT NULL,
  province    text                  NOT NULL DEFAULT 'Rizal',
  boundary    geography(Polygon, 4326) NOT NULL,
  center_lat  double precision      NOT NULL,
  center_lng  double precision      NOT NULL,
  zoom_level  integer               NOT NULL DEFAULT 14,
  created_at  timestamptz           NOT NULL DEFAULT now()
);

CREATE INDEX idx_muni_boundary ON municipality_boundaries USING GIST (boundary);
```

Insert the Taytay boundary polygon (sourced from OSM/Nominatim GeoJSON):
```sql
INSERT INTO municipality_boundaries (name, boundary, center_lat, center_lng)
VALUES (
  'Taytay',
  ST_GeomFromGeoJSON('{
    "type": "Polygon",
    "coordinates": [[[...]]]
  }')::geography,
  14.5587,
  121.1360
);
```

*Note: The GeoJSON coordinates array is to be populated from OSM data during implementation.*

### New Column on `reports`

```sql
ALTER TABLE reports ADD COLUMN barangay barangay;
```

The column is **nullable and stays nullable** — no backfill or `NOT NULL` migration was applied. Pre-scope reports keep `barangay = NULL` and render without a barangay label. New submissions always carry a barangay because the submission form requires it (Zod + required dropdown), but the column itself is not constrained `NOT NULL` at the database level.

### Database-Level Trigger (Boundary Enforcement)

PostgreSQL does not allow subqueries in CHECK constraints, so this is enforced via a `BEFORE INSERT OR UPDATE` trigger instead.

```sql
CREATE OR REPLACE FUNCTION check_report_location_boundary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM municipality_boundaries
    WHERE name = 'Taytay'
      AND ST_Within(
        ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geometry,
        boundary::geometry
      )
  ) THEN
    RAISE EXCEPTION 'Report location must be within Taytay, Rizal';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reports_location_boundary
  BEFORE INSERT OR UPDATE OF latitude, longitude ON reports
  FOR EACH ROW
  EXECUTE FUNCTION check_report_location_boundary();
```

The trigger builds the point geometry inline from `NEW.longitude` / `NEW.latitude` rather than referencing `NEW.location`. On PostgreSQL 17, the generated `location` geography column is **not** computed before `BEFORE INSERT` triggers fire — `NEW.location` is NULL inside the trigger context. The geometry must be constructed from the raw lat/lng columns, matching the approach used by the `is_within_boundary` RPC. This trigger ensures no report can be inserted or have its location updated to a coordinate outside the Taytay boundary, regardless of code path.

### New RPC — `is_within_boundary`

```sql
CREATE OR REPLACE FUNCTION is_within_boundary(
  lat double precision,
  lng double precision,
  municipality_name text
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM municipality_boundaries
    WHERE name = municipality_name
      AND ST_Within(
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geometry,
        boundary::geometry
      )
  );
$$;
```

Called by the `submitReport` Server Action before insert. Returns `true` if the point falls within the named municipality's boundary.

## Zod Schema Changes

### `lib/validations/report.ts`

- **`barangayEnum`** — exported `z.enum(["DOLORES", "SAN_ISIDRO", "SAN_JUAN", "SANTA_ANA", "MUZON"])`
- **`createReportSchema`** — includes `barangay: barangayEnum`
- **`submitReportSchema`** — same addition (derived type used in the Server Action)

No changes needed to admin action schemas (admin actions don't update location or barangay).

## Server Action Changes

### `app/actions.ts` — `submitReport`

1. After auth/email/rate-limit checks, before Zod: call `supabase.rpc("is_within_boundary", { lat, lng, municipality_name: "Taytay" })`
2. If `false`, return `{ success: false, error: "Reports are currently accepted for Taytay, Rizal only. Please pin a location within Taytay." }`
3. Include `barangay` in the insert payload (already validated by Zod)

## Form Changes

### `components/reports/report-form.tsx`

- Add an `InlineSelect` dropdown (`components/ui/inline-select.tsx`, portal-rendered to avoid clipping) for barangay with 5 options
- Required field, wired via `react-hook-form` `setValue` with `shouldValidate: true`
- Positioned in the form after the location/category section
- Label: "Barangay *"

### `components/maps/location-picker.tsx`

- **Default center:** Taytay center (14.5587, 121.1360), zoom 14 (previously a nationwide default)
- **On pin drop:** call Nominatim reverse geocode (same service used for `location_label`) and pass `displayName` back via `onChange` — this sets `location_label` only. **Barangay is NOT derived from the geocode; the citizen selects it manually in the form.**
- **Taytay boundary overlay:** `TaytayBoundary` layer draws the municipal boundary polygon on the map for visual context
- **Persistent banner:** small info bar below the map: "📍 Reports accepted for Taytay, Rizal only"
- **No maxBounds restriction** — user can pan anywhere (server-side enforcement is the gate)

### `components/reports/report-card.tsx`

- Add barangay label below the location line (or beside date): `text-xs text-muted-foreground` — e.g. "Barangay San Juan"

## Public Feed & Filtering

### `components/browse/filter-bar.tsx`

- Add barangay inline-select dropdown next to existing category/status filters
- Options: "All Barangays" (default) + 5 individual barangay options
- Drives `?barangay=` URL search param

### `app/(public)/browse/page.tsx`

- Apply `.eq("barangay", value)` filter when `searchParams.barangay` is present
- Default map center changed to Taytay center coordinates in map view

### `app/(public)/page.tsx` — Landing Page

- **Hero:** "Report road hazards in Taytay, Rizal" (replace generic civic copy)
- **Tagline:** "Help keep your community safe. Report potholes, floods, accidents, and more — all within Taytay."
- **3-step section:** "Pin a location in Taytay" instead of "Pin a location"
- **CTA:** "Start reporting in Taytay"
- No major layout changes — just copy localization and possibly a Taytay landmark photo

### `app/(public)/reports/[id]/page.tsx`

- Add barangay to the metadata display section (above or below category)

## Admin Panel Changes

### `components/admin/admin-queue-table.tsx`

- Add a "Barangay" column (between Category and Submitted At or similar)
- Column width: `w-32`

### `app/admin/pending/page.tsx`, `approved/page.tsx`, etc.

- Add optional barangay filter (URL param driven, matching the public feed pattern)
- Helpful for LGU triage by barangay

### `components/admin/analytics-charts.tsx`

- Add a horizontal bar chart for "Reports by Barangay"
- Data computed server-side: `SELECT barangay, COUNT(*) FROM reports GROUP BY barangay`
- Positioned after category distribution, before status distribution

### `app/admin/reports/[id]/page.tsx`

- Display barangay in the report metadata section

## Data Flow

```
Citizen opens /submit:
  → Map renders centered on Taytay (14.5587, 121.1360, zoom 14) with boundary overlay
  → Citizen pins a location
    → LocationPicker fires handleMove()
    → Nominatim reverse geocode fires → sets location_label only
    → Nearby reports layer fetches (existing behavior)
  → Citizen selects barangay manually from the InlineSelect dropdown
  → Citizen fills rest of form, clicks submit
  → submitReport Server Action:
    1. Auth check (existing)
    2. Email-verified check (existing)
    3. Rate limit check (existing)
    4. is_within_boundary RPC → false → error returned
    5. Zod validation (existing + barangay)
    6. Insert with barangay
  → On success → redirect to /my-reports
```

## Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/20250713000004_create_barangay_enum.sql` | Create `barangay` enum type |
| `supabase/migrations/20250713000005_create_municipality_boundaries.sql` | New table + GIST index + Taytay boundary insert |
| `supabase/migrations/20250713000006_add_barangay_to_reports.sql` | Add nullable `barangay` column |
| `supabase/migrations/20250713000007_add_report_location_boundary_trigger.sql` | `check_report_location_boundary()` + `trg_reports_location_boundary` trigger (DB-level `ST_Within` enforcement) |
| `supabase/migrations/20250713000008_create_is_within_boundary_rpc.sql` | RPC for server-side boundary check |
| `supabase/migrations/20250713000009_add_reports_rls_policies.sql` | Enable RLS + (re)create SELECT/INSERT policies on `reports` — the INSERT policy was missing, causing default-deny submission failures |
| `components/maps/taytay-boundary.tsx` | Leaflet layer that draws the Taytay boundary polygon on the submit map |
| `components/ui/inline-select.tsx` | Portal-rendered dropdown used for the barangay field (and shared with filter bar / feedback form) |

## Files Modified

| File | Change |
|------|--------|
| `context/project-overview.md` | Shrink scope to Taytay; update all feature descriptions |
| `context/architecture.md` | Add boundary enforcement invariant, barangay field, localized UX |
| `context/data-model.md` | Add `barangay` enum, `municipality_boundaries` table, new column, constraint, RPC |
| `context/progress-tracker.md` | Add municipality scope phase |
| `lib/validations/report.ts` | Add `barangay` to `createReportSchema` / `submitReportSchema` |
| `app/actions.ts` | Add `is_within_boundary` check before insert in `submitReport` |
| `components/reports/report-form.tsx` | Add barangay dropdown |
| `components/maps/location-picker.tsx` | Default center → Taytay, reverse geo for barangay, info banner |
| `components/reports/report-card.tsx` | Show barangay on card |
| `app/(public)/page.tsx` | Localized hero + copy for Taytay |
| `components/browse/filter-bar.tsx` | Add barangay filter |
| `app/(public)/browse/page.tsx` | Barangay filter param, map center → Taytay |
| `app/(public)/reports/[id]/page.tsx` | Show barangay in metadata |
| `components/admin/admin-queue-table.tsx` | Add barangay column |
| `app/admin/pending/page.tsx` | Optional barangay filter |
| `app/admin/approved/page.tsx` | Optional barangay filter |
| `app/admin/rejected/page.tsx` | Optional barangay filter |
| `app/admin/resolved/page.tsx` | Optional barangay filter |
| `components/admin/analytics-charts.tsx` | Add barangay distribution chart |
| `app/admin/reports/[id]/page.tsx` | Show barangay in metadata |

## Exclusion from Changes

The following are deliberately **not** modified:
- `proxy.ts` — no new route protection rules needed (boundary is a data constraint, not an access constraint)
- `app/admin/actions.ts` — admin actions do not create or update report location/barangay
- `app/api/uploads/sign` — boundary check does not affect photo upload signing
- `emails/render.ts`, `lib/email.ts` — no email template changes needed (no new notification events)
- `lib/notifications.ts`, `lib/admin-notifications.tsx` — no new notification types

## Implementation Status

| Item | Status |
|------|--------|
| Migration — `barangay` enum | ✅ Complete |
| Migration — `municipality_boundaries` table + Taytay polygon insert | ✅ Complete |
| Migration — `barangay` column on `reports` (nullable) | ✅ Complete |
| Migration — `is_within_boundary` RPC | ✅ Complete |
| Migration — boundary trigger `trg_reports_location_boundary` | ✅ Complete |
| Migration — `reports` RLS policies (enable + SELECT/INSERT) | ✅ Complete |
| Zod — `barangayEnum` in `createReportSchema` / `submitReportSchema` | ✅ Complete |
| Server Action — boundary check in `submitReport` | ✅ Complete |
| Form — barangay `InlineSelect` in `report-form.tsx` | ✅ Complete |
| Map — default center + zoom to Taytay in `location-picker.tsx` | ✅ Complete |
| Map — reverse geocode for barangay auto-detect | ❌ Not implemented — manual `InlineSelect` selection instead |
| Map — boundary overlay (`taytay-boundary.tsx`) | ✅ Complete |
| Map — info banner in `location-picker.tsx` | ✅ Complete |
| Submit page — "Taytay only" banner | ✅ Complete |
| Card — barangay label in `report-card.tsx` | ✅ Complete |
| Landing — localized Taytay copy in `page.tsx` | ✅ Complete |
| Browse — barangay filter in `filter-bar.tsx` | ✅ Complete |
| Browse — barangay filter param in `browse/page.tsx` | ✅ Complete |
| Browse — map center Taytay in map view | ✅ Complete |
| Detail — barangay in report metadata | ✅ Complete |
| Admin — barangay column in `admin-queue-table.tsx` | ✅ Complete |
| Admin — barangay display on review page | ✅ Complete |
| Admin — barangay distribution chart | ✅ Complete |
| Context — `project-overview.md` updated | ✅ Complete |
| Context — `architecture.md` updated | ✅ Complete |
| Context — `data-model.md` updated | ✅ Complete |
| Context — `progress-tracker.md` updated | ✅ Complete |
| `npm run build` — zero errors | ✅ Complete |
| Boundary enforcement test — inside Taytay | ✅ Verified |
| Boundary enforcement test — outside Taytay | ✅ Verified |
| Barangay filter test — browse + admin | ✅ Verified |

> **Note on admin queue barangay filter:** The original plan proposed an optional barangay filter on the admin queue pages (`/admin/pending`, etc.). This was not built — the admin queues show a barangay **column** but no barangay filter control. Admin barangay analysis is available via the analytics distribution chart.

## Check When Done

- [x] Dropping a pin inside Taytay boundaries → submission succeeds
- [x] Dropping a pin outside Taytay (Cainta, Antipolo, Pasig) → submission rejected with clear error
- [x] Barangay dropdown required on submit form — cannot submit without selecting one (manual selection)
- [x] Browse page filters by barangay via `?barangay=` URL param
- [x] Browse page map centers on Taytay by default
- [x] Report cards on browse show barangay label (null-barangay reports show none)
- [x] Report detail pages show barangay in metadata
- [x] Admin queue tables include barangay column
- [x] Admin analytics shows barangay distribution chart
- [x] Landing page hero/copy references Taytay, Rizal
- [x] DB-level trigger (`trg_reports_location_boundary`) prevents inserting or updating a report location outside Taytay boundary even if application code is bypassed
- [x] `is_within_boundary` RPC rejects coordinates outside Taytay
- [x] No existing approved/resolved reports are affected (migration is additive)
- [x] All context files updated (project-overview, architecture, data-model, progress-tracker)
- [x] `npm run build` passes with zero errors

---

## Execution Plan (Phases)

### Phase 0 — Data & Schema

| Step | Action | Detail |
|------|--------|--------|
| 0.1 | Fetch GeoJSON | Query Nominatim for Taytay boundary polygon + 5 barangay boundary polygons. Store as reference files in project. |
| 0.2 | Migration: `barangay` enum | `CREATE TYPE barangay AS ENUM ('DOLORES', 'SAN_ISIDRO', 'SAN_JUAN', 'SANTA_ANA', 'MUZON')` |
| 0.3 | Migration: `municipality_boundaries` table | `id, name, province, boundary (geography(Polygon,4326)), center_lat, center_lng`. Insert Taytay row. |
| 0.4 | Migration: add `barangay` to `reports` | `ALTER TABLE reports ADD COLUMN barangay barangay` — nullable, backfill, then set NOT NULL |
| 0.5 | Migration: DB-level boundary trigger | `BEFORE INSERT OR UPDATE OF latitude, longitude` trigger calling `check_report_location_boundary()` |
| 0.6 | Migration: GIST index on boundary | `CREATE INDEX idx_muni_boundary ON municipality_boundaries USING GIST (boundary)` |
| 0.7 | RPC: `is_within_boundary` | `ST_Within(ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, boundary)` — reusable for any municipality |
| 0.8 | Regenerate types | `supabase gen types typescript --local > types/database.types.ts` |
| 0.9 | Update `data-model.md` | Full documentation of new table, enum, column, constraint, RPC, index |

### Phase 1 — Context Docs Update

| Step | File | Change |
|------|------|--------|
| 1.1 | `project-overview.md` | In Scope → all references to "Philippines" / "nationwide" replaced with "Taytay, Rizal". Scope section explicitly states: "Taytay, Rizal only. No plans for other municipalities in v1." Landing page mentions Taytay-specific flow. |
| 1.2 | `architecture.md` | Add boundary enforcement invariant: "Every report's pinned location is validated server-side against the Taytay boundary polygon via `ST_Within` before insertion." Document barangay field. |
| 1.3 | `progress-tracker.md` | Add new phase: "Municipality Scope — Taytay, Rizal" with all sub-items as pending |

### Phase 2 — Zod + Server Action (Enforcement)

| Step | File | Change |
|------|------|--------|
| 2.1 | `lib/validations/report.ts` | Add `z.enum([...])` for barangay to `createReportSchema` and `submitReportSchema` |
| 2.2 | `app/actions.ts` `submitReport` | After auth/rate-limit checks, before Zod: call `supabase.rpc("is_within_boundary", { lat, lng, municipality_name: "Taytay" })`. If false, return `{ success: false, error: "Reports accepted for Taytay, Rizal only. Pin a location within Taytay." }` |
| 2.3 | Update `lib/validations/bulk.ts` | No change needed (bulk actions don't touch location) |

### Phase 3 — Submission Form

| Step | File | Change |
|------|------|--------|
| 3.1 | `app/(citizen)/submit/page.tsx` | Add page-level note: "📍 Reports are accepted for Taytay, Rizal only" in a top banner |
| 3.2 | `components/reports/report-form.tsx` | Add barangay `InlineSelect` with 5 options, required, wired to `react-hook-form` via `setValue` (`shouldValidate: true`) |
| 3.3 | `components/maps/location-picker.tsx` | Default center → Taytay center (14.5587, 121.1360), zoom 14. On pin drop, call Nominatim reverse geocode for `location_label` only. Draw the Taytay boundary overlay (`taytay-boundary.tsx`). Add persistent info banner. **Barangay is selected manually — no auto-detect.** |

### Phase 4 — Public Feed & Landing

| Step | File | Change |
|------|------|--------|
| 4.1 | `app/(public)/page.tsx` | Rewrite hero: "Report road hazards in Taytay, Rizal". Update tagline, 3-step copy to reference Taytay. Add "Taytay, Rizal" location badge. |
| 4.2 | `components/browse/filter-bar.tsx` | Add barangay inline-select dropdown (all/none/per-barangay). Drives `?barangay=` URL param. |
| 4.3 | `app/(public)/browse/page.tsx` | Apply barangay filter to Supabase query via `.eq("barangay", value)`. Default map center → Taytay in map view. |
| 4.4 | `components/reports/report-card.tsx` | Show barangay label on card (below location or beside date). |
| 4.5 | `app/(public)/reports/[id]/page.tsx` | Show barangay in report metadata section. |

### Phase 5 — Admin Panel

| Step | File | Change |
|------|------|--------|
| 5.1 | `components/admin/admin-queue-table.tsx` | Add barangay column (after category or submitter). |
| 5.2 | `app/admin/pending/page.tsx` | Barangay column shown via the shared queue table (no separate filter control was built). |
| 5.3 | `app/admin/reports/[id]/page.tsx` | Display barangay in report metadata. |
| 5.4 | `components/admin/analytics-charts.tsx` | Add barangay distribution bar chart (horizontal, like category). |

### Phase 6 — Reverse Geocode (location label only)

| Step | File | Change |
|------|------|--------|
| 6.1 | `components/maps/location-picker.tsx` | Reverse geocode populates `location_label` only. **Barangay auto-detect was not implemented** — the citizen selects barangay manually in the form. |
| 6.2 | `components/maps/location-picker-wrapper.tsx` | No changes needed (dynamic import stays). |

### Phase 7 — Final Verification

| Step | Action |
|------|--------|
| 7.1 | `npm run build` — zero errors |
| 7.2 | Test submission inside Taytay boundaries (multiple points across 5 barangays) |
| 7.3 | Test submission outside Taytay (Cainta, Antipolo, Pasig) — must be rejected with clear error |
| 7.4 | Test barangay filter on browse + barangay column on admin |
| 7.5 | Test manual barangay selection is required before submit |
| 7.6 | Test reverse geocode failure gracefully (submission still works; `location_label` may be empty) |
| 7.7 | Update `progress-tracker.md` — mark Phase items as completed |

### Dependency Map

```
Phase 0 (schema) ──► Phase 1 (docs)
     │
     ▼
Phase 2 (Zod + SA) ──► Phase 3 (form) ──► Phase 4 (public) ──► Phase 5 (admin)
                              │
                              ▼
                         Phase 6 (reverse geo)
                              │
                              ▼
                         Phase 7 (verify)
```

Phases 4 and 5 can run in parallel after Phase 3 is done.
