  # Municipality Scope — Taytay, Rizal

## Design

- **Genre:** Scope constraint — reduces the application from nationwide to a single municipality. Adds geographic boundary enforcement, a barangay field on reports, and localizes all copy/UX to Taytay, Rizal.
- **Scope:** All submission, browse, and admin surfaces. Existing reports outside Taytay remain visible (if approved/resolved) but new submissions are rejected if the pinned location falls outside the Taytay boundary polygon.
- **Architecture:** A `municipality_boundaries` table stores the Taytay boundary as a PostGIS `geography(Polygon, 4326)`. A CHECK constraint on `reports` enforces `ST_Within` at the database level. A matching `is_within_boundary` RPC is called in the `submitReport` Server Action for application-level enforcement (defense in depth). A new `barangay` enum and column on `reports` enables barangay-level filtering. Nominatim reverse geocoding auto-detects the barangay on pin drop as a UX convenience. The landing page, nav copy, and meta tags are localized to Taytay.

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
  14.5692,
  121.1326
);
```

*Note: The GeoJSON coordinates array is to be populated from OSM data during implementation.*

### New Column on `reports`

```sql
ALTER TABLE reports ADD COLUMN barangay barangay;

-- Backfill: set a default for existing rows (will be resolved manually later)
-- Then make NOT NULL once all existing rows are assigned
```

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
      AND ST_Within(NEW.location::geometry, boundary::geometry)
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

The `location` geography column already exists (added by the nearby-reports feature). This trigger ensures no report can be inserted or have its location updated to a coordinate outside the Taytay boundary, regardless of code path.

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

- **`createReportSchema`** — add `barangay: z.enum(["DOLORES", "SAN_ISIDRO", "SAN_JUAN", "SANTA_ANA", "MUZON"])`
- **`submitReportSchema`** — same addition (derived type used in the Server Action)

No changes needed to admin action schemas (admin actions don't update location or barangay).

## Server Action Changes

### `app/actions.ts` — `submitReport`

1. After auth/email/rate-limit checks, before Zod: call `supabase.rpc("is_within_boundary", { lat, lng, municipality_name: "Taytay" })`
2. If `false`, return `{ success: false, error: "Reports are currently accepted for Taytay, Rizal only. Please pin a location within Taytay." }`
3. Include `barangay` in the insert payload (already validated by Zod)

## Form Changes

### `components/reports/report-form.tsx`

- Add a `<Select>` (or inline dropdown, matching the existing pattern) for barangay with 5 options
- Required field, wired via `react-hook-form` `Controller`
- Positioned in the metadata section (near category/severity)
- Label: "Barangay *"

### `components/maps/location-picker.tsx`

- **Default center:** Taytay center (14.5692, 121.1326), zoom 14 (previously zoom 11 — nationwide default)
- **On pin drop:** call Nominatim reverse geocode (same service used for `location_label`). Extract barangay from the `address` object in the response:
  - Check `address.village`, `address.suburb`, `address.city_district`, `address.neighbourhood`
  - Map recognized Taytay names to enum values
  - If a match is found, call `onBarangayDetected(barangay)` prop to auto-fill the dropdown
  - If no match or error, the user can select manually (dropdown remains at unselected state)
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
  → Map renders centered on Taytay (14.5692, 121.1326, zoom 14)
  → Citizen pins a location
    → LocationPicker fires handleMove()
    → Nominatim reverse geocode fires (same as location_label)
    → If barangay detected in response → auto-fill barangay dropdown
    → Nearby reports layer fetches (existing behavior)
  → Citizen selects/reviews barangay dropdown (pre-filled or manual)
  → Citizen fills rest of form, clicks submit
  → submitReport Server Action:
    1. Auth check (existing)
    2. Rate limit check (existing)
    3. is_within_boundary RPC → false → error returned
    4. Zod validation (existing + barangay)
    5. Insert with barangay
  → On success → redirect to /my-reports
```

## Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/<timestamp>_create_barangay_enum.sql` | Create `barangay` enum type |
| `supabase/migrations/<timestamp>_create_municipality_boundaries.sql` | New table + Taytay boundary insert |
| `supabase/migrations/<timestamp>_add_barangay_to_reports.sql` | Add nullable `barangay` column |
| `supabase/migrations/<timestamp>_create_is_within_boundary_rpc.sql` | RPC for server-side boundary check |
| `supabase/migrations/<timestamp>_add_report_taytay_constraint.sql` | CHECK constraint for ST_Within |

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
| Migration — `barangay` enum | ⬜ Pending |
| Migration — `municipality_boundaries` table + Taytay polygon insert | ⬜ Pending |
| Migration — `barangay` column on `reports` | ⬜ Pending |
| Migration — `is_within_boundary` RPC | ⬜ Pending |
| Migration — boundary trigger `trg_reports_location_boundary` | ⬜ Pending |
| Zod — barangay in `createReportSchema` | ⬜ Pending |
| Server Action — boundary check in `submitReport` | ⬜ Pending |
| Form — barangay dropdown in `report-form.tsx` | ⬜ Pending |
| Map — default center + zoom to Taytay in `location-picker.tsx` | ⬜ Pending |
| Map — reverse geocode for barangay auto-detect | ⬜ Pending |
| Map — info banner in `location-picker.tsx` | ⬜ Pending |
| Card — barangay label in `report-card.tsx` | ⬜ Pending |
| Landing — localized Taytay copy in `page.tsx` | ⬜ Pending |
| Browse — barangay filter in `filter-bar.tsx` | ⬜ Pending |
| Browse — barangay filter param in `browse/page.tsx` | ⬜ Pending |
| Browse — map center Taytay in map view | ⬜ Pending |
| Detail — barangay in report metadata | ⬜ Pending |
| Admin — barangay column in `admin-queue-table.tsx` | ⬜ Pending |
| Admin — barangay filter on queue pages | ⬜ Pending |
| Admin — barangay distribution chart | ⬜ Pending |
| Admin — barangay display on review page | ⬜ Pending |
| Context — `project-overview.md` updated | ⬜ Pending |
| Context — `architecture.md` updated | ⬜ Pending |
| Context — `data-model.md` updated | ⬜ Pending |
| Context — `progress-tracker.md` updated | ⬜ Pending |
| `npm run build` — zero errors | ⬜ Pending |
| Boundary enforcement test — inside Taytay | ⬜ Pending |
| Boundary enforcement test — outside Taytay | ⬜ Pending |
| Barangay filter test — browse + admin | ⬜ Pending |
| Barangay auto-detect test — Nominatim accuracy | ⬜ Pending |
| Reverse geocode failure test — manual fallback | ⬜ Pending |

## Check When Done

- [ ] Dropping a pin inside Taytay boundaries → barangay auto-fills, submission succeeds
- [ ] Dropping a pin outside Taytay (Cainta, Antipolo, Pasig) → barangay not detected, submission rejected with clear error
- [ ] Barangay dropdown required on submit form — cannot submit without selecting one
- [ ] Browse page filters by barangay via `?barangay=` URL param
- [ ] Browse page map centers on Taytay by default
- [ ] Report cards on browse show barangay label
- [ ] Report detail pages show barangay in metadata
- [ ] Admin queue tables include barangay column
- [ ] Admin queue pages can filter by barangay
- [ ] Admin analytics shows barangay distribution chart
- [ ] Landing page hero/copy references Taytay, Rizal
- [ ] DB-level trigger (`trg_reports_location_boundary`) prevents inserting or updating a report location outside Taytay boundary even if application code is bypassed
- [ ] `is_within_boundary` RPC rejects coordinates outside Taytay
- [ ] No existing approved/resolved reports are affected (migration is additive)
- [ ] All context files updated (project-overview, architecture, data-model, progress-tracker)
- [ ] `npm run build` passes with zero errors

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
| 3.1 | `app/(citizen)/submit/page.tsx` | Add page-level note: "📍 Serving Taytay, Rizal only" in a top banner |
| 3.2 | `components/reports/report-form.tsx` | Add barangay `<Select>` with 5 options, required, wired to `react-hook-form` via `Controller` |
| 3.3 | `components/maps/location-picker.tsx` | Default center → Taytay municipal hall (14.5692, 121.1326), zoom 14. On pin drop, call Nominatim reverse geocode, extract barangay from address components, auto-fill the barangay dropdown. Add persistent info banner. |

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
| 5.2 | `app/admin/pending/page.tsx` | Add optional barangay filter to admin pending queue. |
| 5.3 | `app/admin/reports/[id]/page.tsx` | Display barangay in report metadata. |
| 5.4 | `components/admin/analytics-charts.tsx` | Add barangay distribution bar chart (horizontal, like category). |

### Phase 6 — Check Existing Reports

| Step | File | Change |
|------|------|--------|
| 6.1 | `components/maps/location-picker.tsx` | Update the Nominatim call to extract `barangay` from the `address` object. Map Taytay names to enum values. |
| 6.2 | `components/maps/location-picker-wrapper.tsx` | No changes needed (dynamic import stays). |

### Phase 7 — Final Verification

| Step | Action |
|------|--------|
| 7.1 | `npm run build` — zero errors |
| 7.2 | Test submission inside Taytay boundaries (multiple points across 5 barangays) |
| 7.3 | Test submission outside Taytay (Cainta, Antipolo, Pasig) — must be rejected with clear error |
| 7.4 | Test barangay filter on browse + admin |
| 7.5 | Test auto-detect barangay on pin drop (Nominatim accuracy) |
| 7.6 | Test reverse geocode failure gracefully (user can manually select barangay) |
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
