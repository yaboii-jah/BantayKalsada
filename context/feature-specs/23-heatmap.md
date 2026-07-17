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

## Phase B (Deferred — blocked on user-specified traffic API)

Implement `getExternalHeatPoints()` as a **server proxy route** (hide API key, avoid CORS) for the named provider (TomTom/HERE/Google). Normalize its response into `HeatPoint` tuples and merge into `allHeatPoints`. **No heatmap-UI change required** — the seam is already wired.
