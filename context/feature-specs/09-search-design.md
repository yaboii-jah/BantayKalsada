# Full-Text Keyword Search Implementation

## Design (Hallmark-informed)

- **Genre:** Utility — single input alongside existing filters. No page-level UI, no search results page. Search is a filter parameter, not a separate destination.
- **Placement:** Filter bar in `/browse`, left of the existing category and status dropdowns. Input with magnifying glass icon.
- **Search scope:** `title` and `description` columns of the `reports` table, searched via PostgreSQL `ILIKE` (case-insensitive pattern match). Both columns are searched simultaneously with `OR`.
- **Trigger:** Realtime debounced auto-search (400ms) — as the user types, a pause triggers navigation (resets `page`). Enter still submits instantly. (2026-08-20: changed from Enter-only; debounce matches the interaction pattern of the selects which navigate on change.)
- **Empty/clear:** When the query param `?q=` is empty or absent, no search filter is applied. An X button appears in the input when a query is active — clicking it clears search and navigates to `/browse`.
- **Pagination:** Search respects pagination. The `?q=` param is preserved in page links. Changing the query resets `page` to 1 (same behavior as category/status).
- **Combined filters:** Search ANDs with category and status filters: `(title ILIKE OR desc ILIKE) AND category=X AND status IN (APPROVED, RESOLVED)`.
- **No new database objects (original scope):** The search feature itself shipped without a migration or new indexes — `reports` is small enough for sequential ILIKE scans at current scale. (2026-08-20: migration `20260820000001` later added a `pg_trgm` GIN index on `reports(title)` for the admin queue title search plus the status/category/barangay filter indexes; the `/browse` ILIKE scan remains sequential.)
- **No ranking:** Results are ordered by `submitted_at DESC` regardless of relevance. PostgreSQL full-text search with `tsvector` ranking can be added later without changing the UI.
- **Security:** Supabase's parameterized queries handle ILIKE patterns safely — no SQL injection risk.

### Search Input Visual

```
[🔍 Search by keyword...         X]  [All categories ▼]  [All statuses ▼]  12 reports
```

- **Width:** `w-48` (192px) — compact, inline with the dropdowns
- **Height:** `h-8` — matches the InlineSelect buttons
- **Border:** `border-input` — matches the existing filter dropdowns
- **Magnifying glass:** `Search` icon from lucide-react, `left-2.5`, `pointer-events-none`
- **Clear button:** `X` icon, appears only when `?q=` has a value, `right-1.5`
- **Padding:** `pl-8` (icon space). `pr-8` when clear button present, `pr-2.5` when absent
- **Placeholder:** `"Search by keyword..."` in muted text

### States

| # | State | Visual |
|---|-------|--------|
| 1 | **Empty input, no query** | Input shows placeholder. No clear button. |
| 2 | **Empty input, active query** | `?q=` param is empty string — treated as no filter. X button shown (clears param entirely). |
| 3 | **Typing** | Default browser input behavior. Value not submitted until Enter. |
| 4 | **Enter pressed** | `router.push()` with `?q=<value>` — URL navigation, page resets to 1. |
| 5 | **Query active** | Input shows current query as `defaultValue`. X button visible. |
| 6 | **X clicked** | `router.push()` with `?q=` (empty string — browser removes empty param) — clears search. |
| 7 | **Search + category + status** | All three params in URL. Server query applies AND combination. |
| 8 | **No results** | Existing empty state: "No reports match your filters" with "Clear all filters" link. |

## Data Flow

```
User types "pothole edsa" in search input
  → Presses Enter
  → router.push("/browse?q=pothole+edsa")
  → BrowsePage Server Component receives params
    → params.q = "pothole edsa"
    → query = "pothole edsa" (trimmed)
    → countQuery.or("title.ilike.%pothole edsa%,description.ilike.%pothole edsa%")
    → dataQuery.or("title.ilike.%pothole edsa%,description.ilike.%pothole edsa%")
    → (also applies category/status filters if present)
    → Fetches paginated results
    → Renders matching reports or empty state
```

## Implementation

1. Update `app/(public)/browse/page.tsx` — read `q` param, add ILIKE filter, preserve `q` in pagination `buildHref`
2. Update `components/browse/filter-bar.tsx` — add search input with Enter handler and clear button
3. Update `context/progress-tracker.md`
4. Update `context/project-overview.md` — move search from "Out of Scope" to "In Scope"
5. Update `context/architecture.md` — mention search capability
6. Write `context/feature-specs/09-search-design.md`
7. Verify `npm run build` passes with zero errors

## Implementation Status

| Item | Status |
|---|---|
| `app/(public)/browse/page.tsx` — ILIKE filter + `q` param | ✅ Built |
| `components/browse/filter-bar.tsx` — search input + Enter + clear | ✅ Built |
| `context/progress-tracker.md` — updated | ✅ Built |
| `context/project-overview.md` — moved to In Scope | ✅ Built |
| `context/architecture.md` — search noted | ✅ Built |
| `context/feature-specs/09-search-design.md` — written | ✅ Built |
| `npm run build` passes with zero errors | ✅ Built |

## Check When Done

- [x] `q` param read from URL search params in browse page
- [x] ILIKE filter applied on both `title` and `description` when `q` is non-empty
- [x] Search combines with existing `category` and `status` filters (AND)
- [x] `q` preserved in pagination links (`buildHref`)
- [x] Search input rendered in filter bar before category/status dropdowns
- [x] Enter key triggers `router.push()` with `?q=` param
- [x] X clear button visible when query is active
- [x] Changing `q` resets `page` to 1
- [x] Empty/whitespace query treated as no filter
- [x] No database changes for this feature (migration `20260820000001` later added the admin title `pg_trgm` + filter indexes separately)
- [x] No new packages or dependencies
- [x] `npm run build` passes with zero errors

## Files Added / Modified

### `app/(public)/browse/page.tsx`

Three changes:

1. **Type update** — `searchParams` now includes `q?: string` in the Promise type.

2. **Query extraction** — After parsing `category` and `status`, reads `params.q?.trim() ?? ""`. Only the trimmed value is used — `""` means no filter.

3. **ILIKE filter block** — Inserted after the category filter block:
   ```ts
   if (query) {
     const pattern = `%${query}%`;
     const ilikeFilter = `title.ilike.${pattern},description.ilike.${pattern}`;
     countQuery = countQuery.or(ilikeFilter);
     dataQuery = dataQuery.or(ilikeFilter);
   }
   ```
   Uses Supabase's `.or()` method which generates `WHERE (title ILIKE '%query%' OR description ILIKE '%query%')`. The `.or()` chains naturally with existing `.eq()` and `.in()` filters — all combine via AND.

4. **buildHref update** — `q` is now the first param set in the URLSearchParams builder:
   ```ts
   if (query) p.set("q", query);
   ```

5. **isFiltered update** — Now includes `!!query` in the boolean check so the "No reports match your filters" empty state appears when search yields no results.

### `components/browse/filter-bar.tsx`

1. **Imports** — Added `Search` and `X` from lucide-react.

2. **currentQ** — Reads `searchParams.get("q") ?? ""` alongside `currentCategory` and `currentStatus`.

3. **Search input** — Rendered inside a `relative` div before the `SlidersHorizontal` icon. Contains:
   - `Search` icon (absolute, left, centered vertically, pointer-events-none)
   - `<input type="text">` with `defaultValue={currentQ}` (uses defaultValue, not value, because it's a controlled-via-navigation pattern — the URL param drives the displayed value on page load, but the user types freely until Enter)
   - Placeholder: `"Search by keyword..."`
   - `onKeyDown`: on `Enter`, reads `(e.target as HTMLInputElement).value.trim()` and calls `router.push(buildHref("q", value))`
   - Dynamic `pr-8`/`pr-2.5` based on whether clear button is visible
   - Clear button: `X` icon, only rendered when `currentQ` is truthy, calls `router.push(buildHref("q", ""))`

4. **buildHref function** — Already existed and works correctly: preserving all existing params, setting/removing the target param, deleting `page`.

### Unchanged files

- `app/(public)/browse/loading.tsx` — skeleton unaffected
- `app/(public)/browse/error.tsx` — error boundary unaffected
- `components/browse/pagination-bar.tsx` — unchanged, already receives `buildHref` from page
- `components/reports/report-card.tsx` — unchanged
- All admin files — search is browse-only in v1
- Database — no migrations
