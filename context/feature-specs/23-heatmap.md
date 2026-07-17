# Browse Map Heatmap (Overlay)

## Goal

On `/browse?view=map`, overlay a severity-weighted hazard-density **heatmap underneath** the existing clustered markers, controlled by a single **Heat** on/off toggle. Visitors see both the overall concentration of hazards across Taytay *and* the individual reports (clickable) at the same time — without switching modes.

## Design (Hallmark-informed)

- **Overlay, not a mode switch.** Markers are always rendered (in the `markerPane`, above the heat canvas in the `overlayPane`), so they stay fully clickable. The heat is an underlay that can be hidden for decluttering.
- **Single Heat toggle** (top-right of the map): a pill button labeled "Heat" (with a `Flame` icon) that is filled (`bg-primary`) when on, muted when off. Default state: **on** (overlay visible on load).
- **Heat scope:** all `APPROVED`/`RESOLVED` Taytay reports, **unfiltered** by the active category/status/barangay filters. Its purpose is municipality-wide density context, independent of the viewport. Markers remain viewport-filtered by the bounding-box logic.
- **Weighting:** each report contributes `intensity = severity factor` — `MINOR = 1`, `URGENT = 2`, `EMERGENCY = 3`.
- **External traffic API:** deferred to Phase B, isolated behind the `getExternalHeatPoints()` seam in `lib/heatmap.ts` (currently returns `[]`).

## Requirements

1. Markers (`MarkerClusterGroup`) are always rendered, regardless of the heat state.
2. The heat underlay is rendered only when `showHeat` is `true`; toggling hides/shows it without refitting the map.
3. The heat uses `leaflet.heat`, attached via `window.L = L` + dynamic `import("leaflet.heat")` (the plugin binds to the global `L` — see Implementation Notes).
4. Each heat point is `[lat, lng, intensity]` with the severity weight above.
5. A single Heat toggle button, top-right, styled with existing tokens (no new tokens).
6. The bottom count bar reflects markers (viewport) only and is unchanged in behavior.
7. The external source is merged through the `getExternalHeatPoints()` seam — no heatmap-UI change required to add it later.

## Implementation

### Modified files

- `components/browse/browse-map.tsx` — Replaced the Markers/Heatmap mode toggle with a `HeatToggle` + `showHeat` state; renders `MarkerClusterGroup` always and `{showHeat && <HeatLayer />}` conditionally.

### No changes to (for this overlay change)

- `components/maps/heat-layer.tsx` — unchanged (still builds the layer).
- `lib/heatmap.ts` — unchanged.
- `components/browse/browse-map-wrapper.tsx` — interface unchanged.
- `app/(public)/browse/page.tsx` — heat query unchanged.
- `filter-bar.tsx`, RLS, database, Server Actions, admin files.

### BrowseMap component architecture

```
BrowseMap(reports, heatPoints)
  └─ MapContainer
       ├─ TileLayer
       ├─ TaytayBoundary
       └─ MapContent(reports, heatPoints)
            ├─ HeatToggle (top-right, aria-pressed=showHeat) → setShowHeat
            ├─ MarkerClusterGroup (ALWAYS)
            │    └─ markers for visibleReports (viewport-filtered)
            ├─ {showHeat && <HeatLayer points={allHeatPoints} max={3} />}  (underlay)
            └─ CountBar (bottom overlay) — "Showing X of Y in this area" + [Reset]
```

`allHeatPoints = [...heatPoints, ...externalPoints]` where `externalPoints` come from `getExternalHeatPoints()` (currently `[]`).

### Key implementation details

- `const [showHeat, setShowHeat] = useState(true)` — overlay on by default.
- `HeatToggle` placed `absolute right-4 top-4 z-[1000]`; active = `bg-primary text-primary-foreground`, inactive = `bg-card text-muted-foreground`.
- Render order matters: `MarkerClusterGroup` first, then the conditional `HeatLayer`. Leaflet draws `overlayPane` (heat canvas) below `markerPane` (markers), so markers sit on top and remain interactive.
- Fit-once effect: fits to `reports` if present, else to `allHeatPoints` (so a heat-only view — markers filtered to zero — still frames Taytay). Toggling `showHeat` does **not** refit (no `showHeat` dependency in the fit effect).
- `HeatLayer` is a child of `MapContainer` (uses `useMap()`), so it lives inside the existing `ssr:false` island.

## States

| State | Visual |
|-------|--------|
| Load (default) | Markers clustered + heat underlay visible; "Heat" button filled |
| User clicks Heat (off) | Heat underlay removed; markers remain; "Heat" button muted |
| User clicks Heat (on) | Heat underlay re-added; markers unchanged |
| Filtered to zero markers, heat on | No markers; heat (all Taytay) still visible; count bar "No reports in this area" + Reset |
| No reports AND no heat points | BrowseMap early-returns "No reports to show on map" (no map) |

## Invariants

- Leaflet stays client-only (heat layer is a child of the existing `ssr:false` island).
- The unfiltered heat query returns only `APPROVED`/`RESOLVED` (RLS); only `latitude`, `longitude`, `severity` are selected — no sensitive fields.
- Per-request server client used in the Server Component.
- The heat gradient uses hardcoded hex (allowed exception, documented in `ui-context.md`).

## Implementation Notes (gotchas)

- **`leaflet.heat` global-`L` binding (the real fix).** `leaflet.heat@0.2.0` is a bare IIFE with no UMD wrapper — it does `L.heatLayer = …` directly on the **global** `L`. Leaflet's webpack UMD does **not** set a global `L`, and the imported `L` can be a different object than `window.L`. A static `import "leaflet.heat"` therefore attaches `heatLayer` to a global the component never reads, so the `L.heatLayer` guard silently returns → blank layer, no error. Fix in `components/maps/heat-layer.tsx`: set `window.L = L` **first**, then `await import("leaflet.heat")`, and resolve `heatLayer` from `window.L ?? L`.
- **Stale PWA service worker hides new code.** With `@serwist/next`, the SW precaches the JS bundle, so after a code change the browser keeps serving the old `/browse` page. During development, **Unregister the SW in DevTools + hard-reload** to load new map code. Known dev gotcha (see `app-codebase-context.md`).
- **Tuning:** `radius: 30`, `blur: 20` chosen so sparse Taytay reports read clearly as heat blobs.

## Implementation Status

| Item | Status |
|------|--------|
| `components/maps/heat-layer.tsx` — HeatLayer (leaflet.heat, window.L + dynamic import) | ✅ Built |
| `lib/heatmap.ts` — severityWeight + getExternalHeatPoints seam | ✅ Built |
| `components/browse/browse-map-wrapper.tsx` — forward heatPoints | ✅ Built |
| `app/(public)/browse/page.tsx` — unfiltered heat query | ✅ Built |
| `components/browse/browse-map.tsx` — overlay (markers + Heat toggle) | ✅ Built |
| Context files updated | ✅ Built |
| `npm run build` passes with zero errors | ✅ Built |

## Check When Done

- [x] `/browse?view=map` shows markers **and** heat by default (overlay)
- [x] "Heat" button hides/shows the heat underlay without refitting the map
- [x] Markers remain clickable and clustered when heat is on
- [x] Heat reflects all APPROVED/RESOLVED Taytay reports (unfiltered); markers respect viewport
- [x] Bottom count bar still shows "Showing X of Y in this area" + Reset
- [x] Filters (category/status/barangay/search) still work in map view
- [x] No new tokens; toggle uses `bg-primary` / `bg-card` / `text-muted-foreground`
- [x] `npm run build` passes with zero errors, no `console.log`

## Files Added / Modified

### `components/maps/heat-layer.tsx` — Heat underlay (new, Phase A)

Client component, child of `MapContainer`. In a `useEffect`: sets `window.L = L`, `await import("leaflet.heat")`, resolves `heatLayer` from `window.L ?? L`, builds `L.heatLayer(points, { radius: 30, blur: 20, max: 3, gradient })` and `.addTo(map)`. Cleanup removes the layer (with a `cancelled` flag for StrictMode safety). Gradient is the allowed hardcoded-hex exception.

### `lib/heatmap.ts` — helpers (new, Phase A)

- `severityWeight(severity: string | null | undefined): number` → MINOR=1, URGENT=2, EMERGENCY=3.
- `getExternalHeatPoints(): Promise<HeatPoint[]>` → stub returning `[]` (Phase B seam).
- `HeatPoint` type = `[number, number, number]`.

### `components/browse/browse-map.tsx` — overlay (modified)

- Replaced `MapModeToggle` (Markers|Heatmap) with `HeatToggle` (`showHeat` boolean, default `true`).
- Renders `MarkerClusterGroup` (markers) **always**, and `{showHeat && <HeatLayer points={allHeatPoints} max={3} />}` as the underlay.
- Fit-once effect fits to `reports` (or `allHeatPoints` if no markers); toggling heat does not refit.
- Bottom count bar unchanged (markers/viewport only).

### `app/(public)/browse/page.tsx` — heat query (modified, Phase A)

In the `view === "map"` branch, a separate unfiltered query `.select("latitude, longitude, severity").in("status", ["APPROVED","RESOLVED"])` builds `heatPoints`, passed to `BrowseMapWrapper`.

## Phase B — External Traffic Heatmap (TomTom) [BUILT]

Add a **second, independent "Traffic" heat layer** sourced from the **TomTom Traffic
Flow API** (live congestion), behind its own **Traffic toggle**. Distinct from the
severity-weighted hazard heat (Phase A). Cached server-side in Supabase, rebuilt on a
15-min TTL, shared across all visitors, strict free-tier budget.

### Decisions (grilled)
- **Provider:** TomTom Traffic Flow (`flowSegmentData`, `jamFactor` 0–10).
- **Data:** Live congestion, served from a server-side cache (not client-polled).
- **Layer:** Separate `TrafficLayer` + `TrafficToggle` (UI *does* change — supersedes
  the earlier "no UI change required" note).
- **Cache:** Supabase `traffic_cache` table; server rebuilds the grid once per TTL.
- **Cost:** Strict free tier — ~20 bbox grid points × 96 rebuilds/day (15-min TTL)
  ≈ **1,920 calls/day** < 2,500 TomTom free-tier limit.
- **Deploy:** Serverless → external cache required (no in-memory).
- **Fetch:** Lazy — client calls `GET /api/traffic` only when Traffic toggled ON.
- **Grid:** Bounding-box lat/lng grid over Taytay (~1 km spacing, ~20 pts), no polygon clip.

### TomTom API
- `GET https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/Json?point={lat},{lng}&unit=KMPH&key=$TOMTOM_API_KEY`
- Response: `flowSegmentData.{currentSpeed, freeFlowSpeed, jamFactor (0–10), confidence}`.
- Point-based (no area endpoint) → grid sampling required.

### Architecture
```
GET /api/traffic (server proxy, hides TOMTOM_API_KEY)
  └─ lib/tomtom.ts: getTrafficHeatPoints()
       ├─ cache-read traffic_cache (latest row; TTL 15 min) → return cached
       └─ else buildTrafficGrid():
            ├─ generate ~20 bbox points over TAYTAY_BBOX
            ├─ fetch TomTom per point (concurrency-limited)
            ├─ map jamFactor → intensity
            └─ upsert traffic_cache row
BrowseMap (client)
  ├─ HeatToggle (Phase A, default on)
  ├─ TrafficToggle (default OFF) → on first ON, fetch('/api/traffic') → trafficPoints
  ├─ MarkerClusterGroup (ALWAYS, top)
  ├─ {showHeat && <HeatLayer points={allHeatPoints} max={3} />}        (hazard underlay)
  └─ {showTraffic && trafficPoints.length>0 && <TrafficLayer points={trafficPoints} max={10} />}  (traffic underlay)
```

### Files
- **New** `lib/tomtom.ts` (server-only): `TAYTAY_BBOX`, `buildTrafficGrid()`,
  `getTrafficHeatPoints()` (cache + graceful degradation; no key → `[]`).
  Replaces the dead `getExternalHeatPoints()` seam in `lib/heatmap.ts` (remove it).
- **New** `app/api/traffic/route.ts` (GET, server-only): hides key, returns `{ points }`.
- **New** `components/maps/traffic-layer.tsx` (client, `MapContainer` child): same
  `window.L = L` + dynamic `import("leaflet.heat")` pattern; `max: 10`, `radius: ~35`,
  `blur: 20`, green→yellow→red gradient. *Refactor `heat-layer.tsx` → shared
  `HeatCanvas` with `HeatLayer`/`TrafficLayer` wrappers.*
- **New** `supabase/migrations/…_add_traffic_cache.sql`:
  `traffic_cache(bucket timestamptz PK, points jsonb, fetched_at timestamptz)`.
  Server-only (service-role); browser never queries it.
- **New** `.env.local` + deploy secrets: `TOMTOM_API_KEY` (user-supplied).
- **Modified** `components/browse/browse-map.tsx`: `TrafficToggle` + `showTraffic`
  state + lazy fetch effect; drop `externalPoints` from `allHeatPoints`.
- **Modified** context: `architecture.md`, `app-codebase-context.md`, `ui-context.md`
  (2nd hardcoded-hex gradient exception), `progress-tracker.md`.

### Normalization & visual
- Intensity = raw `jamFactor` (0–10); `TrafficLayer` `max: 10`.
- Gradient: `#16a34a → #eab308 → #f97316 → #dc2626` (congestion ramp), distinct from
  the hazard blue→red ramp.

### Graceful degradation
- No `TOMTOM_API_KEY` → `getTrafficHeatPoints()` returns `[]`; toggle inert.
- TomTom 403/429/network error → serve stale cache or `[]`; log server-side; no crash.
- Empty `trafficPoints` → `TrafficLayer` not rendered.

### Invariants
- Leaflet client-only (TrafficLayer inside `ssr:false` island).
- Key server-only (proxy route; never in client bundle).
- `npm run build` passes; no `console.log`.

### Phase B Checklist
- [x] `lib/tomtom.ts` + `traffic_cache` migration + `TOMTOM_API_KEY` wired (user supplies key)
- [x] `GET /api/traffic` returns cached-or-rebuilt points; key not leaked
- [x] Traffic toggle lazy-fetches; green→red blobs appear under markers
- [x] Heat + Traffic independent; markers stay clickable above both
- [x] Quota guard: first toggle ≈20 calls, repeats within 15 min = 0 (cache)
- [x] Degradation: no key / API error → toggle inert, no crash
- [x] `npm run build` passes with zero errors
