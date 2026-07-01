# Report Submission Page Implementation

## Design (Hallmark-informed)

- **Genre:** Utilitarian — civic safety tool, not a consumer product. Mobile-first: the primary user is a citizen reporting a hazard from their phone.
- **Form structure:** Single scroll page (not multi-step wizard). Field order follows the reporter's mental model: what (category → title → description) → visual proof (photos) → where (map) → send.
- **Colors:** All existing `--color-*` and `--status-*` tokens preserved. No new tokens. No hardcoded hex values.
- **Type:** Inherited project tokens — Inter UI, JetBrains Mono for technical data.

### Form Layout
- Single centered column, `max-w-2xl`
- Full-page scroll — no multi-step wizard in MVP
- Submit button is full-width, pinned to form bottom, disabled with spinner while submitting

### Photo Upload
- Direct browser-to-Cloudinary upload via signed preset (`/api/uploads/sign`)
- Dropzone + thumbnail previews with per-photo remove buttons
- Per-photo upload spinners during Cloudinary upload
- Max 3 photos, each max 5 MB, JPEG/PNG/WebP
- Dedicated "Take picture" camera button using `<input capture="environment">` for mobile field users
- EXIF metadata stripped at Cloudinary preset level

### Location Picker
- Leaflet map with click-to-pin + drag-to-adjust
- "Use My Location" GPS button (top-right of map, avoids Leaflet zoom controls on the left)
- Reverse geocoding via OpenStreetMap Nominatim for location label
- Map starts at PH default center (14.5995, 120.9842) when no GPS available
- Dynamic import with `{ ssr: false }` — Leaflet never renders server-side

### Form Validation
- Zod schema on both client (react-hook-form resolver) and server (Server Action)
- Fields: title (5-120), description (20-2000), category (6 enum), photo_urls (1-3), lat/lng (-90/90, -180/180), location_label (optional)
- Inline error messages per field
- Server-side re-validation in the action

### Rate Limiting
- Max 5 reports per 24-hour window
- Enforced server-side by counting user's `reports` rows with `submitted_at` within the window
- Returns 429-equivalent error message

### Auth Gates (proxy.ts)
- Unauthenticated → `/login?redirect=/submit`
- Unverified email → `/verify-email`
- Authenticated + verified → allows access

### States
- **Loading:** Skeleton form in `loading.tsx` (heading, all field placeholders, map skeleton)
- **Empty:** N/A — form is always populated fresh
- **Uploading:** Per-photo spinner overlay on each thumbnail during Cloudinary upload
- **Submitting:** Full-width spinner on Submit button, form inputs disabled
- **Error (field):** Inline Zod validation error below each field
- **Error (server):** Red error banner above form + Sonner toast
- **Success:** Sonner success toast → redirect to `/browse`

## Components

### New
- `app/(citizen)/layout.tsx` — route group layout, shares PublicNav + Ft2 footer
- `app/(citizen)/submit/page.tsx` — Server Component page
- `app/(citizen)/submit/loading.tsx` — skeleton loading state
- `app/(citizen)/submit/error.tsx` — error boundary with retry
- `app/actions.ts` — `submitReport` Server Action
- `app/api/uploads/sign/route.ts` — Cloudinary signed upload preset endpoint
- `components/reports/report-form.tsx` — main form component
- `components/reports/photo-upload.tsx` — Cloudinary upload widget with camera + gallery
- `components/maps/location-picker.tsx` — Leaflet map with pin + GPS
- `components/maps/location-picker-wrapper.tsx` — dynamic import wrapper
- `lib/validations/report.ts` — Zod schema + inferred types
- `lib/cloudinary.ts` — Cloudinary config and SHA-256 signature helper

### New
- `lib/cloudinary-url.ts` — Cloudinary CDN URL utility, rewrites `res.cloudinary.com` → `res-3.cloudinary.com` for Asia/Pacific regional routing

### Modified
- `app/layout.tsx` — added `<Toaster />` for Sonner toast notifications
- `app/(public)/browse/page.tsx` — added "Submit a report" CTA in header; fixed RLS query returning 0 rows (removed redundant `.in()` filter); added diagnostic logging (later removed)
- `app/(public)/page.tsx` — "Start reporting today" CTA links to `/submit` instead of `/register`
- `components/public-nav.tsx` — nav z-index bumped to `z-[1000]` to stay above Leaflet layers
- `components/reports/report-card.tsx` — applied `getDisplayUrl()` to thumbnail src for Cloudinary CDN rewrite
- `components/browse/photo-gallery.tsx` — applied `getDisplayUrl()` to carousel image srcs for Cloudinary CDN rewrite
- `components/maps/report-map.tsx` — added `L.Icon.Default.mergeOptions()` with explicit unpkg CDN URLs to fix Leaflet default marker icon not rendering in bundler
- `app/actions.ts` — changed `status` from `"APPROVED"` to `"PENDING"` so new reports require admin review
- `app/(public)/browse/page.tsx` — re-added `.in("status", baseStatusFilter)` filter for default "all" view (defense-in-depth alongside RLS)
- `lib/date-utils.ts` — rewrote `formatReportDate` with correct cascade logic (replaced broken loop that produced inflated counts)
- `components/reports/report-card.tsx` — added date display using `formatReportDate()`, right-aligned with `ml-auto` on the badge row
- `components/public-nav.tsx` — bumped z-index from `z-[1000]` to `z-[1100]` to stay above Leaflet zoom controls and location picker button when scrolling past map
- `context/progress-tracker.md` — updated with completed phase

## Implementation

1. Install `react-hook-form`, `@hookform/resolvers`, `zod` as direct dependencies
2. Create `lib/cloudinary.ts` — Cloudinary config and signature generator
3. Create `lib/validations/report.ts` — Zod schema matching DB columns exactly
4. Create `app/api/uploads/sign/route.ts` — GET handler for signed upload preset
5. Create `app/(citizen)/layout.tsx` — route group layout sharing PublicNav + footer
6. Create `app/actions.ts` — `submitReport` Server Action with auth → rate limit → validate → insert
7. Create `components/reports/photo-upload.tsx` — Cloudinary upload widget with camera + gallery inputs
8. Create `components/maps/location-picker.tsx` and wrapper — Leaflet map with click/drag pin + GPS
9. Create `components/reports/report-form.tsx` — react-hook-form + Zod resolver + all sub-components
10. Create `app/(citizen)/submit/page.tsx` + `loading.tsx` + `error.tsx`
11. Add `<Toaster />` to root layout for Sonner toasts
12. Add CTA buttons to browse page and landing page
13. Fix nav z-index to avoid Leaflet overlap
14. Update `context/progress-tracker.md`

## Implementation Status

| Item | Status |
|---|---|
| `/submit` page with full form | ✅ Built |
| Photo upload widget (Cloudinary direct upload) | ✅ Built |
| "Take picture" camera button | ✅ Built |
| Location picker map (Leaflet) | ✅ Built |
| GPS "Use My Location" button | ✅ Built |
| Zod validation (client + server) | ✅ Built |
| Rate limiting (5/24h, server-side) | ✅ Built |
| Auth gates (proxy.ts already protects `/submit`) | ✅ Built |
| Sonner toast notifications | ✅ Built |
| Loading skeleton + error boundary | ✅ Built |
| Mobile responsive | ✅ Built |
| CTA buttons on browse + landing pages | ✅ Built |
| Nav z-index fix for Leaflet overlap | ✅ Built |
| Fix Radix Select scroll-lock (replaced with native `<select>`) | ✅ Built |
| RLS policy fix — add `authenticated` role to browse policy + diagnostic logging removed | ✅ Built |
| Cloudinary CDN rewrite — `lib/cloudinary-url.ts` with `getDisplayUrl()` for Asia/Pacific regional endpoint | ✅ Built |
| Leaflet default marker icon — `L.Icon.Default.mergeOptions()` in `report-map.tsx` | ✅ Built |
| Report status changed from `"APPROVED"` to `"PENDING"` in `app/actions.ts` | ✅ Built |
| Browse page re-added `.in("status")` filter for default "all" view (defense-in-depth) | ✅ Built |
| Fix `formatReportDate` broken loop logic in `lib/date-utils.ts` | ✅ Built |
| Date display on report cards (`/browse`) with `ml-auto` alignment | ✅ Built |
| Nav z-index bumped `z-[1000]` → `z-[1100]` (above Leaflet zoom controls and location button) | ✅ Built |

## Check When Done

- [x] `/submit` renders full form: Category, Title, Description, Photos, Location, Submit
- [x] Photos upload to Cloudinary on selection (per-photo spinners)
- [x] Camera button opens device camera on mobile, file picker on desktop
- [x] Map pin drops on click, draggable, GPS button works
- [x] Form validates all fields client-side before submit
- [x] Server Action re-validates and inserts report with `PENDING` status (not auto-approved)
- [x] Rate limit blocks >5 submissions in 24h
- [x] Unauthenticated users redirected to `/login`
- [x] Unverified users redirected to `/verify-email`
- [x] Loading skeleton shows on page load
- [x] Error boundary catches crashes
- [x] "Submit a report" button on `/browse` links to `/submit`
- [x] "Start reporting today" on `/` links to `/submit`
- [x] Nav stays above Leaflet map when scrolling
- [x] Category select does not shift page layout when opened
- [x] `npm run build` passes with zero errors
- [x] RLS browse fix — `authenticated` role added to policy
- [x] Cloudinary CDN rewrite — `lib/cloudinary-url.ts` rewrites `res.cloudinary.com` → `res-3.cloudinary.com`
- [x] Leaflet marker icons — `L.Icon.Default.mergeOptions()` with unpkg CDN URLs in `report-map.tsx`
- [x] Report status set to `PENDING` (not auto-approved) in Server Action
- [x] Browse page applies `.in("status", ["APPROVED","RESOLVED"])` filter at app level
- [x] `formatReportDate` correctly shows relative times (no more inflated numbers)
- [x] Report cards on `/browse` show date right-aligned on the badge row
- [x] Nav stays above Leaflet zoom controls and location picker when scrolling (<tt>z-[1100]</tt>)

## Files Added / Modified

### `lib/cloudinary.ts` — Cloudinary configuration and signature generation

Reads `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` from environment variables. Exports `getCloudinaryConfig()` returning the config object and `generateSignature(params)` for SHA-256 signing of upload parameters.

The upload preset name is hardcoded as `"bantay-kalsada"`. For uploads to work, this preset must be created in the Cloudinary dashboard (Settings → Upload → Upload presets → Add preset) with:

- **Preset name:** `bantay-kalsada`
- **Signing mode:** `Signed` — required, since `/api/uploads/sign` generates a signature that Cloudinary validates on each upload
- **Folder:** `bantay-kalsada` (recommended for organization)
- **Incoming transformation:** Strip EXIF metadata to prevent location leakage from photo metadata

### `lib/validations/report.ts` — Zod schema for report submission

Defines `createReportSchema` with fields matching the `reports` table columns exactly: `title` (5-120 chars), `description` (20-2000 chars), `category` (6-value enum matching DB `report_category`), `photo_urls` (array of URL strings, 1-3), `latitude` (-90 to 90), `longitude` (-180 to 180), and optional `location_label`. Exports `CreateReportInput` inferred type via `z.infer`.

### `app/api/uploads/sign/route.ts` — Cloudinary signed upload preset (GET)

Returns a JSON object containing `signature`, `timestamp`, `cloud_name`, `api_key`, and `upload_preset`. The client uses these to upload files directly to Cloudinary's `v1_1/:cloud_name/image/upload` endpoint. The signature is generated server-side to prevent unauthorized uploads. The route does not accept, proxy, or store any file bytes.

### `app/actions.ts` — Report submission Server Action (`"use server"`)

The `submitReport` action performs five steps in order:

1. **Authentication** — calls `supabase.auth.getUser()`. Returns 401-style error if no valid session.
2. **Email verification** — checks `user.email_confirmed_at`. Returns error if null.
3. **Rate limiting** — queries `reports` table for the user's submissions in the past 24 hours. Returns error if count >= 5.
4. **Validation** — runs `createReportSchema.safeParse()` on the input. Returns combined error messages if invalid.
5. **Insert** — writes to `reports` table with `status: "PENDING"` (requires admin approval before appearing on browse feed). Returns the new report ID on success.

Uses a `try/catch` wrapper so any unexpected error returns a user-friendly message.

### `app/(citizen)/layout.tsx` — Citizen route group layout

Mirrors the `(public)` layout structure — renders `PublicNav` at the top and a minimal Ft2-style footer at the bottom. This is a separate route group so that middleware/proxy rules can protect these pages differently from public pages (required auth + verified email).

### `app/(citizen)/submit/page.tsx` — Submit page (Server Component)

A thin Server Component that renders the `<ReportForm />` client component inside a centered `max-w-2xl` container with a page heading and explanatory subtitle. The page itself is static at build time; all dynamic behavior lives in the client form.

### `app/(citizen)/submit/loading.tsx` — Loading skeleton

Renders `Skeleton` components mimicking the form layout: heading skeleton, field skeletons for each form section, a 400px map placeholder skeleton, and a full-width button skeleton. Displayed while the page bundle loads.

### `app/(citizen)/submit/error.tsx` — Error boundary

Client component. Catches rendering errors in the submit route. Shows a centered error message with a "Try again" button that calls `reset()` to re-render the page. Displays the error message if available, otherwise a generic fallback.

### `components/reports/report-form.tsx` — Main submission form

Client component using `react-hook-form` with `zodResolver(createReportSchema)`. Field order per the Hallmark-informed design:

- **Category** — native `<select>` styled to match the design system (replaces Radix Select after scroll-lock issue). Options mapped from the `categoryLabels` constant.
- **Title** — Shadcn `Input`.
- **Description** — Shadcn `Textarea` with `min-h-[120px]`.
- **Photos** — `<PhotoUpload>` component. Calls `setValue("photo_urls", ...)` on change.
- **Location** — `<LocationPickerWrapper>` (dynamic import). Calls `setValue` for `latitude`, `longitude`, and `location_label`.
- **Submit** — Full-width Shadcn `Button` with `Send` icon and `Loader2` spinner during submission.

Uses `useTransition` for the pending state (not `useActionState`, since the action accepts structured data, not FormData). Calls `submitReport(null, data)` in a `startTransition` callback. On success: Sonner toast + `router.push("/browse")`. On error: inline error banner + Sonner toast.

### `components/reports/photo-upload.tsx` — Photo upload widget

Client component. Manages its own internal list of `PhotoItem` objects (id, localUrl, cloudinaryUrl, uploading, error). Two file inputs:

- **Gallery** — `<input type="file" accept="image/jpeg,image/png,image/webp" multiple>`. Opens the system file picker allowing multi-select.
- **Camera** — `<input type="file" accept="image/*" capture="environment">`. Opens the device camera directly on mobile (capture attribute). Falls back to file picker on desktop. Single file only.

Both share the same `handleFiles` pipeline: validates type/size/count, creates `URL.createObjectURL` for local preview, uploads to Cloudinary via `fetch` to `api.cloudinary.com`, and updates the photo list. Each thumbnail shows a spinner overlay during upload or an error message on failure. Remove button via `X` icon.

Syncs the parent form via `onChangeRef` pattern (ref-based callback to avoid stale closure issues).

### `components/maps/location-picker.tsx` — Leaflet location picker

Client component using `react-leaflet`. Renders a `MapContainer` (400px height) with `TileLayer` from OpenStreetMap. An inner `LocationMarker` component handles map click events (drops pin) and renders a draggable `Marker` with a fixed default icon.

Key interactions:
- **Click map** — drops a pin at the clicked coordinates, triggers reverse geocoding via Nominatim API, calls `onChange` with lat/lng/label.
- **Drag pin** — updates position and reverse-geocodes on drag end.
- **"Use My Location"** — calls `navigator.geolocation.getCurrentPosition()` with high accuracy, centers map, drops pin, reverse-geocodes. Button positioned at top-right of map (uses `right-3`) to avoid overlapping Leaflet's zoom controls on the top-left.

Map starts at a default Philippine center (14.5995, 120.9842) when no position is set.

### `components/maps/location-picker-wrapper.tsx` — Dynamic import wrapper

Uses `next/dynamic(() => import("..."), { ssr: false })` to load the Leaflet component only on the client. Shows a centered "Loading map..." placeholder (400px height, muted background) while the bundle loads.

### `app/layout.tsx` — Added Toaster

Added `<Toaster />` from `@/components/ui/sonner` inside the `TooltipProvider` wrapper. This is the root-level toast container used by all Sonner toast calls across the app.

### `components/public-nav.tsx` — z-index fix

Bumped the sticky nav's `z-50` to `z-[1000]`. Leaflet map tiles sit at z-index 200–700, so the nav was being overlapped by the map when scrolling the submit page.

### `app/(public)/browse/page.tsx` — Submit CTA

Added a "Submit a report" button in the page header, right-aligned on desktop (`flex-row sm:justify-between`) and full-width below the heading on mobile (`flex-col`). Links to `/submit`. Auth protection is handled by `proxy.ts`.

### `app/(public)/page.tsx` — Landing page CTA

Changed the "Start reporting today" button link from `/register` to `/submit`. This redirects authenticated users to the form, unauthenticated users to login, and unverified users to the verify-email prompt — all managed by `proxy.ts`.

### `lib/cloudinary-url.ts` — Cloudinary CDN URL utility

Exports `getDisplayUrl(url: string): string` that rewrites `res.cloudinary.com` → `res-3.cloudinary.com` (Asia/Pacific regional CDN endpoint). Uses a regex check to only rewrite Cloudinary URLs, leaving all other image URLs untouched. Created because the user's ISP in the Philippines cannot reach the default `res.cloudinary.com` CDN. Applied in `report-card.tsx` (thumbnail) and `photo-gallery.tsx` (carousel images).

### `components/maps/report-map.tsx` — Leaflet default marker icon fix

Added `L.Icon.Default.mergeOptions()` with explicit unpkg CDN URLs for `iconUrl`, `iconRetinaUrl`, and `shadowUrl`. Leaflet's default icon uses relative image paths that break in bundler environments (Next.js, webpack). The mergeOptions call globally fixes all default Leaflet markers in the app. This applies to the detail page map where `<Marker>` uses the default icon (the submit page's `location-picker.tsx` already used a custom `L.icon()` and was unaffected).

### `lib/date-utils.ts` — `formatReportDate` bug fix

The original implementation used a loop over `RELATIVE_UNITS` (minute → hour → day) with two bugs:

1. **Wrong iteration order** — The loop checked `diff < unit.ms` from smallest unit first, making the minutes case (< 60s) unreachable because `"Just now"` already caught diffs < 120s.
2. **Wrong count calculation** — `Math.floor(diff / (unit.ms / 60_000))` divided by minutes-per-unit instead of the unit's milliseconds, producing wildly inflated counts (e.g., 40 minutes showed as "40000 hours ago").

Rewritten as a clean cascade: < 1m → "Just now", < 1h → minutes, < 24h → hours, < 30d → days, 30d+ → formatted Filipino date via `Intl.DateTimeFormat("fil-PH")`.
