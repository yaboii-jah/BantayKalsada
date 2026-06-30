# Public Report Feed Implementation

## Design (Hallmark-informed)

- **Genre:** Editorial (silent default; pre-flight preserves Inter + existing palette)
- **Browse page macrostructure:** Portfolio Grid (18) — filterable cards, responsive grid, no internal rules, card-fade on filter change
- **Landing page macrostructure:** Marquee Hero (03) — bold statement fills fold, below-fold becomes feature/CTA sections
- **Nav:** N9 Edge-aligned minimal — wordmark hard-left, auth buttons hard-right, Sheet on mobile
- **Footer:** Ft2 Inline single line — one horizontal line of copyright + links
- **Enrichment:** None — typography only
- **Motion:** Motion-cut — no animations beyond CSS transitions

### Colors
All existing `--color-*` and `--status-*` tokens preserved. No new tokens. No hardcoded hex values.

### Grid Layout
Responsive card grid using Tailwind:
- 1 col on mobile (default)
- 2 col at `sm` (640px)
- 3 col at `lg` (1024px)
- 4 col at `xl` (1280px)
- 5 col at `2xl` (1536px)

### Filters
- Category dropdown (all 6 categories)
- Status dropdown (APPROVED, RESOLVED)
- Driven by URL search params (`?category=POTHOLE&status=APPROVED&page=2`)
- Result count display
- Client component pushes URL param changes via `useRouter().push()`

### Pagination
- Traditional page-based, 12 reports per page
- Page number bar centered below grid
- Reads current page from searchParams
- Previous/Next + numbered pages

### Report Card
- Photo thumbnail (first photo from array)
- Category badge
- Title
- Location label
- Status badge
- Click navigates to `/reports/[id]`

### Report Detail Page
- Server Component with dynamic client islands
- Photo gallery via Shadcn Carousel (client component, "use client")
- Map via next/dynamic + React Leaflet (ssr: false)
- Metadata: category badge, status badge, location, fil-PH relative/absolute date

### Date Formatting
- fil-PH locale
- Relative: "2 minutes ago", "3 hours ago" (< 1 day)
- Absolute: "June 15, 2026" (>= 1 day)

### States
- Loading: skeleton grid in loading.tsx
- Empty (no reports): friendly illustration + "No reports yet" + CTA to submit
- Empty (no filter matches): "No reports match your filters" + reset filters link
- Error: error boundary with friendly message + retry

## Components

### New
- `app/(public)/layout.tsx` — public route group layout with nav + footer
- `components/public-nav.tsx` — N9 edge-aligned nav, session-aware
- `components/reports/report-status-badge.tsx` — status badge with tokens
- `components/reports/report-card.tsx` — feed card
- `components/browse/filter-bar.tsx` — category + status dropdowns
- `components/browse/pagination-bar.tsx` — page navigation
- `app/(public)/reports/[id]/page.tsx` — detail page
- `components/browse/photo-gallery.tsx` — Carousel wrapper
- `lib/mock-data.ts` — development mock data

### Modified
- `app/browse/` → moved to `app/(public)/browse/`
- `app/page.tsx` — replaced with Marquee Hero landing page
- `app/globals.css` — add `overflow-x: clip` on html/body per Hallmark responsive discipline
- `app/layout.tsx` — add font-heading heading support

## Implementation

1. Update context files
2. Create `(public)` route group layout + nav + footer
3. ReportStatusBadge + ReportCard components
4. Browse page: fetch, grid, filter bar, pagination
5. Browse loading + error boundaries
6. Report detail page: Carousel gallery, dynamic map, metadata
7. Detail not-found + error boundaries
8. Landing page (Marquee Hero)
9. Mock data factory
10. Build verification

## Check When Done

- [ ] `/browse` shows paginated grid of APPROVED/RESOLVED reports (with mock data)
- [ ] Category and status filters work via URL search params
- [ ] Pagination works (12 per page, prev/next + page numbers)
- [ ] Loading skeleton shows while fetching
- [ ] Error boundary catches and displays errors
- [ ] "/reports/[id]" shows full detail with Carousel gallery
- [ ] Map renders on detail page via dynamic import
- [ ] not-found page for invalid report IDs
- [ ] Landing page at `/` shows Marquee Hero with app description
- [ ] Public nav adapts to auth state (sign in/get started vs dropdown)
- [ ] Mobile responsive (single column, Sheet nav, carousel)
- [ ] `npm run build` passes with zero errors
