# Loading Spinner on Filter Navigation

## Goal

Show a loading indicator on the main report grid when users navigate between filters, status tabs, search queries, pages, or view modes — improving perceived performance and preventing layout jump.

## Requirements

1. **Suspense-based** — Uses Next.js `<Suspense>` with a `key` derived from serialized search params. When the key changes (any filter/pagination/view toggle), React unmounts the stale content and shows the fallback while the new async content streams in.

2. **Both pages** — Applied to `/browse` (grid + map views) and `/my-reports` (grid only).

3. **View-aware fallback** — `/browse` map view shows `MapSkeleton` (centered spinner with "Loading map…" label); grid view shows `ReportsGridSkeleton` (card skeletons matching ReportCard layout).

4. **Accurate count** — Report count text (`"N reports"`) lives inside the Suspense-wrapped content component so it's always correct per filter combination, not stale.

5. **No prop drilling** — `totalCount` prop removed from `FilterBar` and `MyReportsFilter`; those are now pure filter controls without count display.

## Implementation

### New file

- `components/reports/reports-grid-skeleton.tsx` — `ReportsGridSkeleton` renders a grid of skeleton cards (aspect-ratio thumbnail placeholder, badge-size blocks, two title lines) matching the responsive grid breakpoints. `MapSkeleton` renders a centered spinner.

### Modified files

- `app/(public)/browse/page.tsx` — Extracted data fetching + rendering into `BrowseReports` async component. Main page reads search params and renders `<Suspense key={suspenseKey} fallback={…}>`. `buildHref` lives inside `BrowseReports`.

- `app/(citizen)/my-reports/page.tsx` — Same extraction into `MyReportsContent` async component.

- `components/browse/filter-bar.tsx` — Removed `totalCount` prop and count `<p>`.

- `components/reports/my-reports-filter.tsx` — Removed `totalCount` prop and count `<p>`.

## States

| State | Behaviour |
|-------|-----------|
| Initial load | `BrowseReports` / `MyReportsContent` streams in; Suspense shows skeleton until data resolves |
| Filter change (category, status) | Page navigates via `<Link>` → search params change → `suspenseKey` changes → Suspense shows fallback → new `BrowseReports` renders |
| Search query | Same as filter change (Enter or clear X triggers router.push) |
| Page navigation | Same — `?page=` changes → key changes → skeleton shown |
| View toggle (grid ↔ map) | Same — `?view=` changes → key changes → appropriate fallback shown |
| Empty results | No data returned → empty state renders (no skeleton, no grid) |
| Error | Handled by existing `error.tsx` boundaries (not in scope of this change) |

## Invariants

- `key` prop on Suspense must include **all** search params that affect the query: `view`, `category`, `status`, `q`, `page` for browse; `status`, `page` for my-reports.
- The async sub-component must stay co-located in the page file (not extracted to a separate file) for simplicity, since it's only used there.
- Fallback always shows when any search param changes, even if the data would be instant (e.g., switching from a page with results to an empty-filter page).
