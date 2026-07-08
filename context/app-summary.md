# Bantay Kalsada — Codebase Context

This file documents the app's architecture, routing, access model, data flow patterns, and key conventions. Covers the complete v1 implementation including Google OAuth, in-app notifications, keyword search, map view with bounding box filter, admin analytics, and Suspense-boundary loading for filter navigation.

---

## Route Groups (The 4 "Rooms")

The app uses Next.js App Router **route groups** to enforce access tiers. Each group is a folder wrapped in parentheses (except `/admin`) — they don't affect the URL, they just give different pages different layouts and access rules.

| Group | Routes | Access | Layout |
|-------|--------|--------|--------|
| `(public)` | `/`, `/browse`, `/reports/[id]` | Anyone — no auth needed | Shared nav + footer (Ft2 inline) |
| `(auth)` | `/login`, `/register`, `/reset-password` | Unauthenticated only | Centered card on gradient bg |
| `(citizen)` | `/submit`, `/my-reports`, `/my-reports/[id]` | Auth + verified email | Same nav/footer as public |
| `admin/` | `/admin/*` (dashboard with analytics, queues, review) | Auth + `role: ADMIN` | Sidebar + content canvas |

---

## The Security Layer Cake

Protection is applied at **three independent layers**, all of which must agree:

### 1. `proxy.ts` (Edge-level — convenience guard)

Replaces the deprecated `middleware.ts`. Runs on every request. Three redirect rules:

- **Authenticated on auth routes** (`/login`, `/register`, `/reset-password`) → `/browse` (or `/admin` if admin)
- **Unauthenticated on protected routes** (`/submit`, `/my-reports`, `/admin`) → `/login?redirect=<path>`
- **Unverified on `/submit`** → `/verify-email`

The proxy creates a Supabase server client directly from the request cookies to call `auth.getUser()`. It uses `createServerClient` with empty `setAll()` — cookie mutation is handled by `updateSession()`.

**Important:** The proxy does NOT check admin role for `/admin` access (that would require a DB read on every request). Role verification is done server-side in the layout and every Server Action. This is intentional.

### 2. Layout-level (Page-level — primary guard)

Every protected route group has a layout that independently verifies auth server-side:

- `app/admin/layout.tsx` — calls `supabase.auth.getUser()` + queries `profiles.role === 'ADMIN'`. Redirects non-admins to `/browse`.
- `app/(citizen)/layout.tsx` — the citizen group layout (shares PublicNav + footer). Auth check is inherited from the proxy, but the layout enforces the route group boundary.

### 3. Server Action-level (Mutation-level — final guard)

Every `"use server"` action independently calls `supabase.auth.getUser()` as its first step. Admin actions additionally call the extracted `verifyAdmin()` helper which checks `profiles.role === 'ADMIN'`.

This three-layer pattern means: even if the proxy is somehow bypassed, the layout catches it. Even if the layout is somehow skipped, the Server Action catches it.

---

## Supabase Client Factories (Exactly 3)

| File | Key | Purpose |
|------|-----|---------|
| `lib/supabase/server.ts` | Anon key + cookie handling | Per-request client for Server Components and Server Actions. Reads auth from HTTP cookies via `@supabase/ssr`'s `createServerClient`. Must be called inside each handler — never at module level. |
| `lib/supabase/client.ts` | Anon key | Singleton browser client. Created once at module level via `createBrowserClient`. Used in `"use client"` components for auth flows (login, register, sign out). |
| `lib/supabase/service-role.ts` | `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS entirely. Used ONLY in admin Server Actions and admin pages (reading all reports, moderating status changes). NEVER exposed to the browser. Stateless (`autoRefreshToken: false`, `persistSession: false`). |

---

## Data Flow Pattern

### Reads (Server Components)

```
Page Component (server)
  → createSupabaseServerClient()
  → supabase.from("reports").select(...).in("status", ["APPROVED","RESOLVED"])
  → render cards/grid/table
```

All data fetching happens server-side. Client components receive data as props.

### Writes (Server Actions)

```
Form (client "use client")
  → startTransition(() => action(null, data))
  → Server Action ("use server" in app/actions.ts or app/admin/actions.ts)
    → 1. supabase.auth.getUser()
    → 2. email_confirmed_at check (submit only)
    → 3. rate limit check (submit only)
    → 4. Zod validation (createReportSchema / approveReportSchema / etc.)
    → 5. Supabase insert/update (anon key for citizen, service role for admin)
    → 6. Fire-and-forget notification dispatch (admin actions only)
  → return { success: true, data } or { success: false, error }
  → Client receives response → toast + redirect
```

---

## Complete Flow: Submit a Report

Tracing what happens from citizen submission to public visibility.

### Step 1: Form in Browser

**File:** `components/reports/report-form.tsx`

A `"use client"` component using `react-hook-form` with `zodResolver(createReportSchema)`. Fields in order: Category → Title → Description → Photos → Location (map).

Uses `useTransition` for pending state (not `useActionState`) because:
- react-hook-form manages form state
- The Server Action accepts structured data, not FormData
- The transition just needs a busy flag for the submit spinner

### Step 2: Photos Upload to Cloudinary

**File:** `components/reports/photo-upload.tsx`

Before form submit, photos are uploaded directly to Cloudinary:
1. `GET /api/uploads/sign` → returns signed upload preset (signature, timestamp, cloud_name, api_key, upload_preset)
2. `POST https://api.cloudinary.com/v1_1/:cloud/image/upload` → returns Cloudinary URL
3. URL stored in component state, sent to server on form submit

**Architectural invariant:** Photo binary NEVER passes through Next.js. The only API route (`/api/uploads/sign`) issues only a signature — it never receives or proxies file bytes.

**File:** `app/api/uploads/sign/route.ts`

Returns `{ signature, timestamp, cloud_name, api_key, upload_preset }`. The signature is a SHA-256 hash generated server-side using `CLOUDINARY_API_SECRET`. This prevents unauthorized uploads.

### Step 3: Server Action Processes Submission

**File:** `app/actions.ts` — `submitReport()`

Five checks in order, each short-circuiting on failure:

1. **Authentication** — `supabase.auth.getUser()`. Returns 401 error if no valid session.
2. **Email verification** — `user.email_confirmed_at`. Returns error if null.
3. **Rate limiting** — `COUNT(*)` reports by `submitted_by_id` in last 24 hours via `.eq("submitted_by_id", user.id)`, `.gte("submitted_at", 24hago)`, `.limit(5)`. Returns 429 error if count >= 5.
4. **Input validation** — `createReportSchema.safeParse(input)`. Returns combined error messages if invalid.
5. **Database insert** — writes to `reports` table with `status: "PENDING"`. Returns new report ID.

The report is saved with `PENDING` status — it is NOT automatically visible on the public feed. An admin must approve it first.

Rate limiting uses `head: true, count: "exact"` for efficiency (no row data returned, just a count). Runs before Zod validation in the current implementation (minor ordering note).

### Step 4: Admin Approves

**File:** `app/admin/actions.ts` — `approveReport(reportId)`

Sequence:
1. `verifyAdmin()` — auth + role check (extracted shared helper with discriminated union return type)
2. `approveReportSchema.parse({ reportId })` — Zod UUID validation
3. `fetchReportWithSubmitter(reportId)` — fetches report status, title, and submitter profile via service role client
4. `adminClient.from("reports").update(...)` — sets `status: "APPROVED"`, `reviewed_by_id`, `reviewed_at`
5. Fire-and-forget: `sendReportNotifications(...)` → creates notification row + sends Brevo email
6. Returns `{ success: true }`

The service role client bypasses RLS — needed because the admin is reading other users' reports and mutating rows they don't own.

**Status transition invariant:** Only `PENDING → APPROVED`, `PENDING → REJECTED`, and `APPROVED → RESOLVED` are allowed. Each transition is a dedicated Server Action with a hard-coded target status — never accepted as a free-form client value.

### Step 5: Appears on Public Feed

**File:** `app/(public)/browse/page.tsx` (Server Component)

```tsx
const supabase = await createSupabaseServerClient();
const { data: reports } = await supabase
  .from("reports")
  .select("*")
  .in("status", ["APPROVED", "RESOLVED"])
  .order("submitted_at", { ascending: false })
  .range(0, 11);
```

Two layers prevent unapproved reports from leaking:
1. **RLS policy** at the database level: `USING (status IN ('APPROVED', 'RESOLVED'))` for anonymous reads
2. **Application filter** via `.in("status", ...)` — defense in depth

The page renders a responsive card grid (1→5 columns) or a map with clustered markers, with:
- Category + status filter bar, keyword search input, grid/map view toggle (all driven by URL search params: `?category=POTHOLE&status=APPROVED&q=pothole&view=map&page=2`)
- Map view: shows all filtered results as Leaflet markers with clustering via `react-leaflet-cluster`; a purely client-side bounding box filter constrains markers and count to the current viewport as the user pans/zooms; a dynamic count bar displays "Showing X of Y reports in this area" with a Reset button
- Pagination bar (12 per page, hidden in map view)
- Suspense-boundary loading: data-fetching sub-components wrapped in `<Suspense key={serializedParams}>` show skeleton cards or map spinner when filters change
- Loading skeleton (`loading.tsx`)
- Error boundary with retry (`error.tsx`)
- Empty state (no reports / no filter matches)

---

## Component Architecture Pattern

Every route follows the same file hierarchy:

```
page.tsx          — Server Component (fetches data, renders children)
loading.tsx       — Skeleton while page bundle loads
error.tsx         — Error boundary with retry button
not-found.tsx     — Custom 404 (detail pages only)
```

Client components are used only when required (Leaflet maps, form interactions, `usePathname`, `useSearchParams`, `useState`). Sub-components live in `components/{feature}/`.

### Suspense-Boundary Loading for Filter Navigation

In addition to `loading.tsx` (skeleton while the page bundle loads), browse and my-reports pages wrap their data-fetching sub-components in `<Suspense key={serializedParams}>`. When any filter/pagination/search param changes, the key changes and the Suspense fallback (skeleton cards or map spinner) is shown while the server re-fetches data. The report count text was moved inside the Suspense boundary so it updates with each filter — the `FilterBar` and `MyReportsFilter` no longer receive a `totalCount` prop.

```
page.tsx (Server)
  └─ Suspense key={serializedParams} fallback={<ReportsGridSkeleton />}
       └─ AsyncContent (Server, fetches data + renders grid/map/pagination)
```

### Server Component → Client Island

```
page.tsx (Server)           — fetches data, passes to children via props
  └─ Client component       — interactive island inside server content
       └─ next/dynamic()    — for Leaflet maps, with { ssr: false }
```

Leaflet and React Leaflet are NEVER rendered server-side. Every component that imports from `leaflet` or `react-leaflet` is loaded via `next/dynamic(() => import(...), { ssr: false })`. Violating this causes a `window is not defined` build/runtime crash.

**Leaflet marker icon fix:** In bundler environments, Leaflet's default marker icon breaks because CSS-expected image paths don't exist. Fixed in `components/maps/report-map.tsx` by calling `L.Icon.Default.mergeOptions()` with explicit unpkg CDN URLs. The location picker (`location-picker.tsx`) uses a custom `L.icon()` and was unaffected.

**Cloudinary CDN fix:** The user's ISP cannot reach `res.cloudinary.com` (default CDN). `lib/cloudinary-url.ts` exports `getDisplayUrl()` that rewrites to `res-3.cloudinary.com` (Asia/Pacific regional CDN). Applied in `report-card.tsx` and `photo-gallery.tsx`.

---

## Key Architectural Decisions

### Server Actions over API Routes
All mutations (submit report, approve, reject, resolve) use `"use server"` actions in `app/actions.ts` and `app/admin/actions.ts`. No `route.ts` handlers for CRUD. This follows Next.js 16's recommended pattern for first-party app mutations.

### Template Strings over React Email
`react-dom/server` (`renderToStaticMarkup`) cannot be imported in Next.js 16 App Router. `emails/render.ts` builds HTML via template literal functions — no JSX, no `@react-email/components`. Each function returns a complete HTML document with inline styles. This was chosen after attempting React Email and hitting the render pipeline restriction.

### Fire-and-Forget Notifications
Email + notification insertion happens after the status update succeeds, wrapped in `.catch()` so failures are logged but never block the status transition. Report moderation is never gated on email deliverability. Three subsystems are involved:
- `lib/email.ts` — Brevo client singleton (`@getbrevo/brevo` v5 SDK)
- `lib/notifications.ts` — notification insert + message/subject helpers
- `lib/admin-notifications.tsx` — orchestration layer (uses `.tsx` because it imports JSX from email templates)

### Auth Email Templates (Not in Repo)
Verification and password-reset emails are managed inside the Supabase Dashboard — they are not in `emails/`. Only report status notification templates (approved, rejected, resolved) live in the codebase.

### Unidirectional Status Transitions
Report status follows strict rules:
- `PENDING → APPROVED`
- `PENDING → REJECTED`
- `APPROVED → RESOLVED`

No API or Server Action accepts a free-form `status` value from the client. Each transition is a dedicated function with the target status hard-coded.

### Rate Limiting is Server-Side Only
Max 5 submissions per user per 24-hour window. Enforced by counting the authenticated user's `reports` rows with `submitted_at` within the window. Client-side button disabling is a UX courtesy only and cannot be relied upon.

### Performance Fixes Documented
- **RLS policy fix:** `createSupabaseServerClient()` returns an `authenticated` session when the user is logged in. The original browse RLS policy only covered `anon`, causing 0 rows for logged-in users. Fixed by adding `authenticated` to the public-read policy.
- **`formatReportDate` bug:** Original implementation used a loop with wrong iteration order and wrong count calculation (dividing by minutes-per-unit instead of milliseconds). Rewritten as a clean cascade: <1m → "Just now", <1h → minutes, <24h → hours, <30d → days, 30d+ → formatted fil-PH date.
- **Nav z-index:** Public nav uses `z-[1100]` to stay above Leaflet layers (zoom controls use z-1000, location picker uses z-1000).

---

## What the `notifications` Table Already Stores

The `notifications` table is populated by all three admin actions (approve, reject, resolve). Each insert creates:

| Column | Value |
|--------|-------|
| `user_id` | The citizen who submitted the report |
| `report_id` | The report that changed status |
| `type` | `REPORT_APPROVED` / `REPORT_REJECTED` / `REPORT_RESOLVED` |
| `message` | Human-readable text (e.g., "Your report '...' has been approved.") |
| `is_read` | `false` (ready for v1.1 mark-as-read) |

The backend for a v1.1 notification center is fully in place — only the citizen-facing UI is missing (bell icon, dropdown, mark-as-read).

---

## File Organization Reference

```
app/                     — Next.js App Router pages, layouts, loading states, error boundaries
  actions.ts             — citizen Server Actions (submitReport)
  (auth)/                — login, register, reset-password
  auth/callback/         — OAuth callback (exchanges Google code for session)
  (citizen)/             — submit, my-reports
  (public)/              — landing, browse, reports/[id]
  admin/                 — dashboard, queues, review, admin Server Actions
  api/uploads/sign       — Cloudinary signed upload preset
  verify-email/          — email verification prompt

components/
  admin/                 — sidebar, queue table, action buttons, status count cards, analytics charts
  auth/                  — auth card, branding panel, Google sign-in button
  browse/                — filter bar, pagination bar, photo gallery, browse map (clustered, bounding box filter)
  maps/                  — Leaflet map, location picker (all client-side, dynamic import)
  reports/               — report form, card, status badge, photo upload, my-reports filter, reports-grid-skeleton
  ui/                    — Shadcn/ui primitives (DO NOT EDIT)

lib/
  supabase/              — client factories (server, client, middleware, service-role)
  validations/           — Zod schemas + inferred types
  cloudinary.ts          — Cloudinary config + signing
  cloudinary-url.ts      — CDN URL rewriting (res → res-3 for Asia/Pacific)
  email.ts               — Brevo client
  notifications.ts       — notification creation helpers
  admin-notifications.tsx— report lookup + email dispatch orchestration
  date-utils.ts          — fil-PH date formatting
  mock-data.ts           — 36 development mock reports

emails/
  render.ts              — HTML email generators (template strings, no JSX)

types/
  database.types.ts      — Generated Supabase types (DO NOT EDIT BY HAND)
