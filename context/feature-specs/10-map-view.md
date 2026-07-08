# Map View on Browse Feed Implementation

## Design (Hallmark-informed)

- **Genre:** Utility — toggleable view mode on the existing browse page. No separate page, no new route. The map replaces the card grid in-place.
- **Toggle:** Segmented button group (`LayoutGrid` / `Map` icons) in the filter bar, right of the status filter. Drives `?view=map` / `?view=grid` URL param.
- **Data:** Map view fetches ALL filtered results (no pagination range) so users see every relevant pin at once. Pagination is hidden in map view.
- **Markers:** Default Leaflet markers with custom popups showing thumbnail, title, category badge, status badge, and "View details" link.
- **Fit bounds:** On mount, the map calls `fitBounds()` on all marker coordinates with 48px padding. Single-marker case centers at zoom 15.
- **Filters fully respected:** Category, status, and keyword search all apply in map view. Changing any filter re-fetches data (standard URL navigation).
- **Empty state:** Same empty state as grid view — "No reports match your filters" with clear-all link.
- **Marker clustering:** Uses `react-leaflet-cluster` to group nearby markers into numbered bubbles. Clusters split on zoom. Handles duplicate coordinates and dense areas without overlapping markers.
- **Packages added:** `react-leaflet-cluster` (pulls in `leaflet.markercluster`).

### View Toggle Visual

```
[🔍 Search...] [▼ All categories] [▼ All statuses] [⊞|🗺]  12 reports
```

- Segmented button group, `border border-input rounded-lg overflow-hidden`
- Two buttons, each `size-8` (32px), flex centered
- Active: `bg-accent text-foreground`
- Inactive: `bg-transparent text-muted-foreground hover:bg-accent/50`
- Lucide icons: `LayoutGrid` for grid, `Map` for map

### Marker Popup Visual

```
┌──────────────────────┐
│ [thumbnail 4:3 192px]│
│                      │
│ Report Title (bold)  │
│ [Pothole] [APPROVED] │
│ View details →       │
└──────────────────────┘
```

- 192px wide, thin rounded corners
- Thumbnail shows first photo (if exists)
- Title: `font-semibold text-foreground truncate`
- Category badge: `bg-muted text-muted-foreground text-[10px]`
- Status badge: colored per existing status tokens
- "View details →" link: `text-primary text-xs`, navigates to `/reports/[id]`

### States

| # | State | Visual |
|---|-------|--------|
| 1 | **Grid view (default)** | Card grid, pagination visible. `?view=grid` or no view param. |
| 2 | **Map view** | Full-width Leaflet map replaces grid. Pagination hidden. `?view=map`. |
| 3 | **Map loading** | "Loading map…" skeleton with same aspect ratio. |
| 4 | **Map, no results** | "No reports to show on map" centered message (in map's own empty state). |
| 5 | **Map toggle active** | Map icon highlighted, grid icon unhighlighted in toggle. |
| 6 | **Grid toggle active** | Grid icon highlighted, map icon unhighlighted. |
| 7 | **Filter change in map view** | URL navigation → page re-fetches all results → map re-renders with new pins. |
| 8 | **Single marker** | Map centers on that marker at zoom 15. |

### Map Component States (BrowseMap)

| # | State | Visual |
|---|-------|--------|
| 1 | **Loading** | Handled by wrapper — skeleton with "Loading map…" |
| 2 | **Rendering** | `MapContainer` with tile layer + markers |
| 3 | **Empty** | "No reports to show on map" centered fallback |
| 4 | **Single marker** | `setView([lat, lng], 15)` via `FitBounds` component |
| 5 | **Multiple markers** | `fitBounds()` with 48px padding |
| 6 | **Popup open** | Click on marker shows popup with thumbnail + details |
| 7 | **Popup link clicked** | Navigates to `/reports/[id]` |
| 8 | **Error** | Handled by Next.js error boundary (same as grid view) |

## Data Flow

```
User clicks Map icon in toggle
  → router.push("/browse?view=map")
  → BrowsePage receives params.view = "map"
  → view = "map" (skips range, no pagination)
  → dataQuery (no .range()) fetches ALL filtered results
  → pageReports = all matching reports
  → BrowseMapWrapper receives reports as props
    → BrowseMap renders MapContainer + markers + FitBounds
    → All pins visible, map fits to bounds

User clicks a marker
  → Popup opens with report details
  → User clicks "View details →"
  → navigates to /reports/[id]

User clicks Grid icon in toggle
  → router.push("/browse")
  → view = "grid" (default)
  → Paginated data fetch resumes
  → Card grid renders
```

## Implementation

1. Create `components/browse/browse-map.tsx` — Leaflet map with markers + popups + FitBounds
2. Create `components/browse/browse-map-wrapper.tsx` — dynamic import with ssr:false
3. Update `app/(public)/browse/page.tsx` — add `view` param, conditional fetch/render, hide pagination
4. Update `components/browse/filter-bar.tsx` — add `view` prop + toggle button group
5. Update `context/progress-tracker.md`
6. Update `context/project-overview.md`
7. Update `context/architecture.md`
8. Write `context/feature-specs/10-map-view.md`
9. Verify `npm run build` passes with zero errors

## Implementation Status

| Item | Status |
|---|---|
| `components/browse/browse-map.tsx` | ✅ Built |
| `components/browse/browse-map-wrapper.tsx` | ✅ Built |
| `app/(public)/browse/page.tsx` — view param, map fetch, conditional render | ✅ Built |
| `components/browse/filter-bar.tsx` — toggle button group | ✅ Built |
| `context/progress-tracker.md` — updated | ✅ Built |
| `context/project-overview.md` — map view noted | ✅ Built |
| `context/architecture.md` — map view noted | ✅ Built |
| `context/feature-specs/10-map-view.md` — written | ✅ Built |
| `npm run build` passes with zero errors | ✅ Built |

## Check When Done

- [x] `?view=map` URL param toggles between grid and map views
- [x] Map view fetches all filtered results without pagination range
- [x] Grid view continues to use paginated fetch (no behavior change)
- [x] Map renders with OpenStreetMap tiles and standard markers
- [x] Each marker has a popup with thumbnail, title, category, status, "View details" link
- [x] `fitBounds()` on mount shows all markers; single marker centers at zoom 15
- [x] Pagination bar hidden in map view
- [x] Filter bar shows toggle button group with `LayoutGrid` + `Map` icons
- [x] Active toggle state properly highlighted
- [x] Changing filters preserves `view=map` in URL
- [x] Empty state works in map view (shows "No reports match your filters")
- [x] Map wrapper uses `dynamic()` with `{ ssr: false }` — no SSR crash
- [x] No new packages or dependencies
- [x] No database changes
- [x] `npm run build` passes with zero errors

## Files Added / Modified

### `components/browse/browse-map.tsx` — Map with markers

Client component that receives an array of `BrowseMapReport` objects and renders a full-width Leaflet map:

- **`FitBounds` child component** — Uses `useMap()` hook to call `fitBounds()` or `setView()` on mount. Extracted as a separate component because `useMap()` must be called inside `MapContainer`'s children.
- **Marker popup rendering** — Each `Marker` has a `Popup` with: optional thumbnail (first photo, 4:3 `aspect-[4/3] w-48 rounded object-cover`), title (`font-semibold`), category badge, status badge, and "View details →" link to `/reports/[id]`.
- **Empty state** — If `reports` array is empty, renders a centered "No reports to show on map" message in a muted bg container with same aspect ratio as the map.
- **Default center** — Philippines approximate center `[14.5, 121]` used as initial center before `FitBounds` adjusts.

Category labels and status colors use inline maps matching the same tokens used in `ReportCard` and `ReportStatusBadge`.

### `components/browse/browse-map-wrapper.tsx` — Dynamic import wrapper

Standard pattern matching `report-map-wrapper.tsx`:
- `dynamic(() => import(...), { ssr: false })`
- Loading skeleton with "Loading map…" text
- Same aspect ratio: `aspect-[4/3]` on mobile, `lg:aspect-[3/2]` on desktop
- Type-safe props matching `BrowseMapReport[]`

### `app/(public)/browse/page.tsx` — View-aware data fetching

Three changes:

1. **Source import** — Added `BrowseMapWrapper` and `LayoutGrid` imports.

2. **View param** — Parses `params.view === "map" ? "map" : "grid"` alongside existing params.

3. **Conditional fetch** — When `view === "map"`, fetches `dataQuery` without `.range()` to get all filtered results. When `view === "grid"`, uses the existing paginated range approach. `totalCount` for map view comes from the fetched array length (count is already correct from `countQuery`).

4. **Conditional render** — When `view === "map"` and results exist, renders `BrowseMapWrapper` with mapped report data. When `view === "grid"` and results exist, renders the card grid as before.

5. **Pagination hidden** — `totalPages > 1 && view === "grid"` condition for the `PaginationBar`.

6. **buildHref preserves view** — `if (view === "map") p.set("view", "map")` ensures the map view is preserved across filter changes.

7. **FilterBar view prop** — Passes `view` prop to `FilterBar` for the toggle highlight state.

### `components/browse/filter-bar.tsx` — View toggle

1. **Imports** — Added `LayoutGrid` and `Map` from lucide-react.

2. **Props** — `view: string` added alongside `totalCount`.

3. **Toggle button group** — Rendered after the status `InlineSelect`. Two buttons in a `border border-input rounded-lg overflow-hidden` container. Active state uses `bg-accent text-foreground`, inactive uses `bg-transparent text-muted-foreground hover:bg-accent/50`. Each button calls `router.push(buildHref("view", "grid"))` or `buildHref("view", "map")`.

### Unchanged files

- `components/reports/report-card.tsx` — unchanged
- `components/maps/report-map.tsx` — unchanged (detail page map)
- `components/maps/report-map-wrapper.tsx` — unchanged
- All admin files — map view is browse-only
- Database — no migrations
