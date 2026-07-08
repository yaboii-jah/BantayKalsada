# Admin Analytics Dashboard

## Goal

Add charts and key metrics to the existing admin dashboard (`/admin`) so administrators can see submission trends, category distribution, status breakdown, and moderation efficiency at a glance.

## Requirements

1. **Server-computed data** — All metrics are computed server-side in the existing admin page server component. The client chart component receives pre-computed typed props — no client-side fetching.
2. **Existing dashboard page** — Analytics appear below the existing status count cards, not as a separate page.
3. **Three charts + metrics row:**
   - Reports over time (area chart, last 30 days)
   - Category distribution (horizontal bar chart)
   - Status distribution (donut chart)
   - Key metric cards (approval rate %, avg resolution hours, reports this month)
4. **Recharts library** — SVG-based, works with React Server Components via client wrapper.
5. **Design token conformance** — Chart colors use the project's existing status hex values (`#d97706`, `#16a34a`, `#dc2626`, `#2563eb`) and a defined 5-color category palette. No inline hex outside those tokens.

## Implementation

### New dependency

- `recharts` — SVG chart library for React.

### New file

- `components/admin/analytics-charts.tsx` — `"use client"` component with:
  - `MetricCard` sub-component (label + large number)
  - `ChartCard` sub-component (card wrapper with title)
  - `AnalyticsCharts` main component rendering the 3 charts + metrics row
  - All chart colors defined as constants from the design system

### Modified files

- `app/admin/page.tsx` — Replace 4 separate `head: true` count queries with a single query fetching `submitted_at, category, status, resolved_at` from all reports. Compute status counts, category counts, daily submission counts (30 days), approval rate, avg resolution time, and reports-this-month in server-side JS. Pass result to `<AnalyticsCharts>`.
- `app/admin/loading.tsx` — Add skeleton blocks for charts area below existing card skeleton.
- `context/progress-tracker.md` — Move from Next Up to Completed.
- `context/project-overview.md` — Move from Out of Scope to In Scope.
- `context/architecture.md` — Note analytics on admin page.
- `package.json` — `recharts` added.

### No changes to

- Auth, RLS, admin guard, sidebar, layout — unchanged.
- No new API routes, Server Actions, or database schema.

## States

| State | Behaviour |
|-------|-----------|
| Data loaded with reports | All charts render with computed data, metrics cards show values |
| No reports in database | Charts render with empty arrays (recharts handles gracefully); metrics show `0` / `0%` / `0h` |
| Loading | `loading.tsx` shows skeleton blocks for status cards + chart areas |
| Error | Handled by existing `app/admin/error.tsx` boundary |

## Invariants

- All data computation must happen in the server component — the client chart component must be stateless and receive data as props only.
- Daily submissions array must contain exactly 30 entries (one per day, zeros for days with no reports).
- Approval rate = `APPROVED / (APPROVED + REJECTED) * 100`.
- Avg resolution time = average of `resolved_at - submitted_at` in hours for all `RESOLVED` reports with a non-null `resolved_at`.
- Reports this month = reports where `submitted_at` is >= the first day of the current month.
