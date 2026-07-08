# Map-Driven Geographic Bounding Box Filter

## Goal

When viewing `/browse?view=map`, the map auto-constrains its markers and report count to the current viewport bounds as the user pans and zooms — no additional UI or button needed. The map *is* the filter.

## Requirements

1. **Purely client-side** — No server round-trip on pan/zoom. The initial server fetch returns all reports matching category/status/search filters; the client instantly sub-filters by viewport.
2. **Instant feedback** — Marker count and report count update on every `moveend` / `zoomend` event with zero network latency.
3. **No URL params** — Panning/zooming does not push URL params to avoid SEO spam and back-button pollution.
4. **Dynamic count display** — A client-rendered count bar shows `"Showing {visible} of {total} reports in this area"` and updates as the viewport changes.
5. **Reset button** — A "Reset" button appears when bounds are active (i.e., not all reports visible) that refits the map to all reports.
6. **Marker clustering preserved** — `react-leaflet-cluster` wraps the visible markers so dense areas stay grouped.

## Implementation

### Modified files

- `components/browse/browse-map.tsx` — Main implementation (see below)
- `app/(public)/browse/page.tsx` — Remove server-rendered count from map view branch (count now lives in the client map component)

### No changes to

- `filter-bar.tsx` — Filter controls are unchanged
- `browse-map-wrapper.tsx` — Interface is unchanged
- Any server code (Server Actions, API routes, RLS, auth)
- Other pages or components

### BrowseMap component architecture

```
BrowseMap(reports)
  └─ MapContainer
       ├─ TileLayer
       ├─ FitBounds (on mount only — fits all reports)
       ├─ BoundsTracker (useMapEvents: moveend/zoomend)
       │   └─ L.latLngBounds → visibleReports via .contains()
       ├─ MarkerClusterGroup
       │   └─ markers for visibleReports only
       └─ CountBar (bottom overlay)
            ├─ "Showing {n} of {total} reports in this area"
            └─ [Reset] button (visible when n < total)
```

`BoundsTracker` is a separate inner component so it can call `useMapEvents()` inside the `MapContainer` context.

### Key implementation details

- `visibleReports` derived via `useMemo(() => reports.filter(r => bounds.contains([r.latitude, r.longitude])), [bounds, reports])`
- `allBounds` pre-computed via `useMemo(() => L.latLngBounds(reports.map(r => [r.lat, r.lng])), [reports])` for the Reset action
- `map.fitBounds(allBounds, { padding: [48, 48] })` on Reset click
- Count bar styled with `z-[1000]` to sit above Leaflet layers, `pointer-events-none` on container with `pointer-events-auto` on the Reset button
- MarkerClusterGroup receives `visibleReports` not `reports` — cluster counts update automatically

## States

| State | Visual | Count bar |
|-------|--------|-----------|
| Initial load (all reports visible) | All markers rendered, clustered if dense | "Showing 142 reports" (no reset button) |
| User pans/zooms away | Only markers within bounds visible; clustered | "Showing 8 of 142 reports in this area" + [Reset] |
| No reports in viewport | No markers, empty map area | "No reports in this area" + [Reset] |
| After Reset | Fits all reports, all markers back | "Showing 142 reports" (reset hidden) |
| Single report in viewport | Single marker, no cluster | "Showing 1 of 142 reports in this area" + [Reset] |

## Invariants

- The server always fetches the full filter-matched report set for map view. The bounding box is never a server-side filter — only a client-side viewport optimisation.
- `BoundsTracker` must be a child of `MapContainer` (to access `useMapEvents`), not a sibling.
- MarkerClusterGroup must receive the filtered array — it handles cluster creation/reduction automatically based on what it receives.
- The count bar uses the same responsive layout tokens as the rest of the app (text-sm, text-muted-foreground).
- Reset button disappears when `visibleReports.length === reports.length` (i.e., user hasn't scrolled away from the full set).
