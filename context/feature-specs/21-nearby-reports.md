# Nearby Existing Reports on Submit

## Design

- **Genre:** Utility — shows the citizen existing approved/resolved reports near their pinned location before they submit a new one. Prevents duplicates and helps users see if an issue is already reported.
- **Scope:** Submit form only (`/submit`). Not available on other pages. Only shows APPROVED/RESOLVED reports within 200m radius. Max 25 results.
- **Architecture:** PostGIS `geography(Point, 4326)` generated column on `reports` with a GIST spatial index. A `SECURITY INVOKER` RPC function (`get_nearby_reports`) uses `ST_DWithin` for the distance query. A client component (`NearbyReportsLayer`) renders severity-colored chip markers with popup details inside the existing `LocationPicker` map. Query fires on pin drop only (debounced by the pin change event).

### Entry Points

| Entry | Route | Purpose |
|-------|-------|---------|
| Submit form map | `/submit` | Shows nearby reports as chip markers when citizen pins a location |

## Database Changes

### Enable PostGIS

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### New Generated Column on `reports`

```sql
ALTER TABLE reports ADD COLUMN location geography(Point, 4326)
  GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED;

CREATE INDEX idx_reports_location ON reports USING GIST (location);
```

The column is computed from existing `longitude` and `latitude` columns. No backfill needed — generated columns are auto-populated for existing rows on migration apply.

### New RPC Function

```sql
CREATE OR REPLACE FUNCTION get_nearby_reports(
  lat double precision,
  lng double precision,
  max_distance_m double precision DEFAULT 200
)
RETURNS TABLE(
  id uuid, title text, category report_category,
  severity report_severity, photo_urls text[],
  latitude double precision, longitude double precision,
  location_label text, submitted_at timestamptz,
  distance_m double precision
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT id, title, category, severity, photo_urls,
         latitude, longitude, location_label, submitted_at,
         ST_Distance(location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) AS distance_m
  FROM reports
  WHERE status IN ('APPROVED', 'RESOLVED')
    AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, max_distance_m)
  ORDER BY distance_m ASC
  LIMIT 25;
$$;
```

`SECURITY INVOKER` ensures the caller's RLS policies apply (the SELECT policy already restricts to `APPROVED`/`RESOLVED`). The WHERE clause redundantly filters status for defense in depth.

## Chip Marker — `components/maps/nearby-reports-layer.tsx`

### Design

- Severity-colored dot (green/yellow/red) + distance text in a white pill with colored border
- Rendered via `L.divIcon` with `className: ""` to avoid Leaflet default icon styles
- Positioned above the report's coordinates via `iconAnchor`

### States

- **No pin dropped:** Component receives `lat: null, lng: null` — sets empty array, renders nothing.
- **Loading:** Query is fast (<100ms locally) — no loading indicator needed. Fetch uses cancelled flag to discard stale results.
- **Empty:** No reports within 200m — no markers rendered. Map shows only the user's pin.
- **Populated:** Chip markers rendered for each nearby report. Severity dot color reflects report urgency.
- **Error:** `console.error` only — no user-facing toast (query is best-effort, non-blocking).
- **Marker tap:** Opens Leaflet popup showing photo thumbnail, title, severity badge, status badge, distance, date, and a "View full details →" link opening `/reports/[id]` in a new tab.

### Edge Cases

- **Report has no photos:** Popup omits the photo thumbnail — title and badges still shown.
- **Report at 0 distance:** Shows `<1m` in the chip.
- **Report >25 results:** Closest 25 returned (LIMIT).
- **Pin dragged to new location:** `lat`/`lng` props change → component clears old markers, re-fetches.
- **User taps "Use My Location":** Same effect as dropping a pin — chip markers appear.
- **PostGIS extension not enabled:** RPC call returns an error — logged to console, no markers rendered.
- **RPC returns error:** Logged to console, no markers rendered (silent failure).

## Data Flow

```
Citizen opens submit form:
  → LocationPicker renders map with NearbyReportsLayer inside MapContainer
  → Citizen taps map or "Use My Location"
  → LocationPicker.handleMove() fires with new lat/lng
  → NearbyReportsLayer receives new lat/lng props
    → useEffect fires: cancelled flag incremented, supabase.rpc("get_nearby_reports", ...)
    → RPC function runs ST_DWithin on GIST-indexed geography column
    → Returns top 25 closest APPROVED/RESOLVED reports with distance
    → setReports() updates state
    → Second useEffect clears old markers, renders new chip markers with popups
  → Citizen taps a chip marker
    → Popup opens with report summary + "View full details →" link
    → Link opens /reports/[id] in new tab (submit form preserved behind)
```

## Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/20250713000001_enable_postgis.sql` | Enable PostGIS extension |
| `supabase/migrations/20250713000002_add_report_location.sql` | Add geography column + GIST spatial index |
| `supabase/migrations/20250713000003_create_get_nearby_reports_rpc.sql` | Create RPC function |
| `components/maps/nearby-reports-layer.tsx` | Client component fetching + rendering chip markers with popups |

## Files Modified

| File | Change |
|------|--------|
| `components/maps/location-picker.tsx` | Import and render `<NearbyReportsLayer>` inside `<MapContainer>` |

## Implementation Status

| Item | Status |
|------|--------|
| Migration — enable PostGIS extension | ✅ Done |
| Migration — `location` geography column + GIST index | ✅ Done |
| Migration — `get_nearby_reports` RPC function | ✅ Done |
| Component — `nearby-reports-layer.tsx` with chip markers, popups, cancelled fetch | ✅ Done |
| Integration — `location-picker.tsx` renders layer below `<LocationMarker>` | ✅ Done |
| View details link in popup | ✅ Done |
| `npm run build` passes with zero errors | ✅ Done |

## Check When Done

- [x] Dropping a pin on the submit form shows nearby reports as severity-colored chip markers
- [x] Chip shows colored dot + distance (e.g. "45m", "<1m")
- [x] Tapping a chip shows popup with photo (if available), title, severity badge, status badge, distance, date
- [x] Popup has "View full details →" link opening `/reports/[id]` in new tab
- [x] Moving the pin clears old markers and re-fetches
- [x] No pin dropped = no markers (empty)
- [x] No nearby reports = no markers (silent)
- [x] Max 25 results, sorted by distance ascending
- [x] RPC uses SECURITY INVOKER (respects RLS) + redundant status filter
- [x] Stale fetch handling via cancelled flag
- [x] `npm run build` passes with zero errors
