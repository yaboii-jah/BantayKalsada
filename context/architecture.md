# Architecture Context

## Stack

| Layer      | Technology                            | Role                                                                                                                                          |
| ---------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework  | Next.js 14+ (App Router) + TypeScript | Full-stack framework — handles page routing, server components, SSR, and API route handlers                                                   |
| UI         | Tailwind CSS + Shadcn/ui              | Utility-first styling and accessible, unstyled component primitives (forms, modals, toasts, tables)                                           |
| Auth       | Supabase Auth                         | Email/password authentication, email verification, and password reset — all handled natively; no custom token flows required                  |
| Database   | Supabase (PostgreSQL)                 | Hosted PostgreSQL database — accessed via `@supabase/supabase-js`; schema managed via Supabase CLI migrations; RLS policies enforce access control at the database level |
| Storage    | Cloudinary                            | Cloud storage and CDN for report photos — direct browser-to-Cloudinary upload via signed preset; EXIF stripping enforced at preset level      |
| Maps       | Leaflet.js + React Leaflet            | Client-side interactive map for location pinning on report submission and display on report detail pages                                      |
| Email      | Brevo + template strings             | Transactional email delivery for report status notifications only (approved, rejected, resolved) — auth emails (verification, password reset) are sent by Supabase Auth |
| Validation | Zod                                   | Runtime schema validation on all API route handler inputs and report submission form fields                                                   |

---

## System Boundaries

- `app/(public)/` — Guest-accessible pages requiring no authentication: landing page (`/`), public report feed (`/browse`), and individual report detail pages (`/reports/[id]`). The browse feed supports keyword search via ILIKE on title + description, category filtering, status filtering, map view (all filtered results as Leaflet markers with viewport-aware bounding box filtering), and pagination — all driven by URL search params. The map's bounding box filter is purely client-side: the server fetches all matching reports, and the client constrains markers and count to the current viewport as the user pans/zooms. All pages in this group are Next.js Server Components and render only `APPROVED` or `RESOLVED` reports. The Supabase server client used here is initialized with the anon key and relies on RLS to enforce the status filter at the database level.

- `app/(auth)/` — Unauthenticated-only pages: registration (`/register`), login (`/login`), and password reset (`/reset-password`). Email verification is handled by a Supabase-generated link — no custom `/verify-email` route is needed. All Unauthenticated users are redirected away from these routes.

- `app/(citizen)/` — Protected pages requiring an authenticated Supabase session with a verified email: report submission form (`/submit`), personal report history (`/my-reports`), individual own-report detail (`/my-reports/[id]`), feedback submission (`/feedback`), and personal feedback history (`/my-feedback`, `/my-feedback/[id]`). The notification bell in the nav provides in-app notification access (lazy-fetched dropdown, mark-as-read, delete). Unverified users attempting to access `/submit` are redirected to a prompt to verify their email. Session is read server-side via the Supabase server client.

- `app/admin/` — Strictly protected pages requiring an authenticated session with `role: ADMIN` on the user's profile record: dashboard (`/admin`) with status count cards and analytics charts (submissions over time, category distribution, status distribution, approval rate, avg resolution time), pending queue (`/admin/pending`), status-separated report lists (`/admin/approved`, `/admin/rejected`, `/admin/resolved`), the report review page (`/admin/reports/[id]`), and the feedback inbox (`/admin/feedback`, `/admin/feedback/[id]`). The feedback review page includes the `FeedbackNoteEditor` component for adding, editing, and removing admin notes. Analytics data is computed server-side from a single query and passed as props to a recharts-based client component. Any non-admin request is rejected at middleware and re-verified server-side in every route handler using the service role client.

- `public/` — Static assets served at `/`. Contains `manifest.json` (PWA manifest), app icons (192x192, 512x512, Apple 180x180), and `sw.js` (generated service worker). The service worker is compiled from `app/sw.ts` via `@serwist/next` at build time and precaches all JS/CSS/fonts. Runtime caching uses network-first for navigations and stale-while-revalidate for images.

- `app/sw.ts` — Service worker entry point. Defines precaching for static assets, runtime caching strategies for pages and images. Bundled into `public/sw.js` by `@serwist/next` during `next build`.

- `app/api/` — API route handlers. Owns no UI. Responsible for Cloudinary signed upload preset generation (`/api/uploads/sign`). Mutations (report submission, admin approve/reject/resolve) are implemented as Server Actions (`app/actions.ts`, `app/admin/actions.ts`), not API routes. Every handler validates its input with Zod before touching the database.

- `app/auth/callback/route.ts` — OAuth callback route. Receives the authorization code from Supabase after Google OAuth consent, exchanges it for a session via `exchangeCodeForSession()`, and redirects the user to the app.

- `components/` — Shared UI components not tied to a single route. Subdivided into `components/ui/` (Shadcn/ui primitives), `components/maps/` (Leaflet map components — always client-side only), `components/browse/` (filter bar, pagination, photo gallery, browse map), `components/reports/` (report card, report form, photo upload widget, status badge, feedback form, feedback card), `components/admin/` (admin queue table, rejection modal, action buttons, analytics charts, feedback actions), `components/notification-bell.tsx` (in-app notification dropdown), and `components/install-prompt.tsx` (PWA install banner).

- `lib/` — Shared utilities and Supabase client factories. Contains: `lib/supabase/server.ts` (Supabase server client factory — creates a per-request client using `@supabase/ssr`'s `createServerClient`), `lib/supabase/client.ts` (Supabase browser client — created once using `createBrowserClient`), `lib/supabase/middleware.ts` (session refresh helper called in `middleware.ts`), `lib/email.ts` (Brevo client), `lib/cloudinary.ts` (Cloudinary config and signing helper), `lib/validations/` (all Zod schemas including `updateFeedbackNoteSchema`), `lib/notifications.ts` (in-app notification creation helper — supports `FEEDBACK_NOTE_ADDED` alongside existing feedback notification types), `lib/admin-notifications.tsx` (report submitter lookup + email dispatch; also contains `sendFeedbackNotifications` for feedback notifications with optional `adminNote` parameter), and `lib/utils.ts` (general helpers).

- `supabase/` — Supabase project configuration: `supabase/migrations/` (SQL migration files generated by the Supabase CLI), `supabase/seed.sql` (seed script for the initial admin profile), and `supabase/config.toml` (local dev configuration). All schema changes are made by creating new migration files via `supabase migration new` — existing migration files are never edited.

- `emails/` — Template string HTML generators for report status and feedback notification emails. `emails/render.ts` exports seven functions: `baseLayout()`, `renderApprovedEmail()`, `renderRejectedEmail()`, `renderResolvedEmail()`, `renderFeedbackAcknowledgedEmail()`, `renderFeedbackNoteAddedEmail()`, `renderFeedbackClosedEmail()`. Auth email templates (verification, password reset) are managed inside the Supabase dashboard — they do not live in this folder. React Email was not used — `react-dom/server` cannot be imported in Next.js App Router, so emails are built via string interpolation.

---

## Storage Model

- **Supabase PostgreSQL**: All structured application data. The `auth.users` table is Supabase-managed and stores credentials, email verification status, and session tokens — this table is never written to directly from application code. A `profiles` table, owned by the application, is kept in sync with `auth.users` via a PostgreSQL trigger that fires on new user creation; it stores the user's display name and `role` (`CITIZEN` or `ADMIN`). The `reports` table stores title, description, category, status, rejection reason, an array of Cloudinary photo URLs, latitude, longitude, location label, and all relevant timestamps. The `notifications` table stores in-app notification records (type, read status, linked report ID or feedback ID). The `feedback` table stores app feedback submissions (type, title, description, optional rating, status, admin note — a nullable text field that admins can write and update independent of the status lifecycle). No binary file data, passwords, or auth tokens are stored in application-owned tables.

- **Cloudinary**: All report photo files (JPEG, PNG, or WebP; max 5 MB each; 1–3 photos per report). Photos are uploaded directly from the browser using a short-lived signed upload preset generated by `/api/uploads/sign`. The database stores only the resulting Cloudinary URL and public ID for each photo — never the binary content. EXIF metadata is stripped at the upload preset level; location is never inferred from photo metadata.

---

## Auth and Access Model

- **Authentication**: Users authenticate via Supabase Auth (email + password or Google OAuth). Supabase manages the full auth lifecycle natively: registration, email verification link delivery, session issuance, token refresh, password reset link delivery, and OAuth token exchange. Sessions are stored as access and refresh token pairs in `httpOnly` cookies, managed automatically by `@supabase/ssr`. Application code never handles passwords or auth tokens directly. The OAuth callback is handled by `app/auth/callback/route.ts`, which exchanges the authorization code for a session via `exchangeCodeForSession()`.

- **Email verification**: After registration, Supabase Auth sends a verification email automatically using the template configured in the Supabase dashboard. No custom token storage or Resend integration is needed for this flow. A user whose email is unverified can log in but is blocked from accessing `/submit` and from calling `POST /api/reports`. This check reads the `email_confirmed_at` field from the Supabase session server-side — it is never enforced client-side alone.

- **Roles**: Every user has a corresponding row in the `profiles` table (created automatically by a database trigger on `auth.users` INSERT) with a `role` field defaulting to `CITIZEN`. To assign the `ADMIN` role, update the `profiles` row directly via Supabase Studio or via the seed script at `supabase/seed.sql`. There is no in-app UI for role management in MVP. Route handlers read the role from the `profiles` table using the authenticated user's ID from the Supabase session.

- **Ownership**: Every report record carries a `submitted_by_id` foreign key referencing `auth.users.id`. When a citizen queries their own reports, the RLS policy on the `reports` table automatically restricts results to rows where `submitted_by_id = auth.uid()`. Route handlers never accept a user ID from the request body to determine ownership — they always read the authenticated user's ID from the server-side Supabase session.

- **Access control**: Three access tiers are enforced by a combination of RLS policies (database level) and server-side session checks (application level). (1) Public — no session required; RLS allows `SELECT` only on reports where `status IN ('APPROVED', 'RESOLVED')`; all other tables are inaccessible. (2) Citizen — valid Supabase session + verified email required; RLS allows citizens to `SELECT` and `INSERT` their own reports, and `SELECT` and `UPDATE` (mark as read) their own notifications. Notification `DELETE` uses the service-role client because the `notifications` table has no DELETE RLS policy — ownership is enforced server-side by filtering `user_id`. (3) Admin — valid session + `role: ADMIN` on the profile record required; admin operations use the Supabase service role client to bypass RLS. The service role key is never exposed to the browser.

---

## Invariants

1. **A report is never returned to the public without an explicit status filter.** The RLS policy on the `reports` table enforces `status IN ('APPROVED', 'RESOLVED')` for all public (unauthenticated) reads at the database level. Application-level filtering after fetching all records is not acceptable and must not be used as a substitute.

2. **Photo files never pass through Next.js API routes.** The browser uploads photos directly to Cloudinary using a signed preset. The `/api/uploads/sign` route issues only the signature; it never receives or proxies the file bytes. Only the resulting Cloudinary URL is sent to the server and stored in the database.

3. **The Supabase server client is created per request, never as a module-level singleton.** `lib/supabase/server.ts` exports a factory function that calls `createServerClient` on each invocation — it must be called inside each Server Component, Route Handler, or Server Action that needs database access, not at the top of a module. The browser client in `lib/supabase/client.ts` is the only Supabase client that may be instantiated once at the module level.

4. **Leaflet and React Leaflet components are never rendered server-side.** Every component that imports from `leaflet` or `react-leaflet` must be loaded using `next/dynamic` with `{ ssr: false }`. Violating this causes a `window is not defined` crash at build or runtime.

5. **Admin authorization is verified server-side in every admin Server Action.** Middleware redirects are a UX convenience only. Every Server Action in `app/admin/actions.ts` independently reads the Supabase session, fetches the user's profile via the `verifyAdmin()` helper, and confirms `profile.role === 'ADMIN'` before executing any logic. A missing session or non-admin role returns an error immediately.

6. **Rate limiting is enforced server-side.** The `submitReport` Server Action rejects submissions when the authenticated user has already submitted 5 or more reports within the past 24 hours, counted via a database query. Client-side disabling of the submit button is a UX courtesy only and cannot be relied upon.

7. **Rejection reasons are private to the report submitter.** The RLS policy on the `reports` table ensures the `rejection_reason` column is never exposed in public queries. It is returned only when a citizen reads their own report and only because the RLS policy confirms `submitted_by_id = auth.uid()`.

8. **Report status transitions are unidirectional and explicit.** The only valid transitions are `PENDING → APPROVED`, `PENDING → REJECTED`, and `APPROVED → RESOLVED`. No Server Action may accept an arbitrary status value from the client. Each transition is a dedicated Server Action (`approveReport`, `rejectReport`, `resolveReport` in `app/admin/actions.ts`) that hard-codes the target status — status is never a free-form client-supplied value.

9. **Feedback status transitions are explicit.** The valid transitions are `OPEN → ACKNOWLEDGED` and `OPEN/ACKNOWLEDGED → CLOSED`. Each transition is a dedicated Server Action (`acknowledgeFeedback`, `closeFeedback` in `app/admin/actions.ts`) that hard-codes the target status — status is never a free-form client-supplied value.

10. **Feedback rate limiting is enforced server-side.** The `submitFeedback` Server Action rejects submissions when the authenticated user has already submitted 3 or more feedback entries within the past 24 hours, counted via a database query. Client-side disabling of the submit button is a UX courtesy only and cannot be relied upon.

11. **Feedback notifications follow the same fire-and-forget pattern as report notifications.** Email and in-app notification dispatch happens after the status update succeeds, wrapped in `.catch()` so failures are logged but never block the status transition.

12. **Admin notes on feedback are updated independently of status.** The `updateFeedbackNote` Server Action modifies only the `admin_note` column and never changes feedback status. Notifications are sent only on first-time note add (null → string), not on edits or clears.

13. **Service worker caching uses specific strategies per resource type.** Static assets (JS, CSS, fonts) are precached at install time. Navigations use network-first with cache fallback (stale page loads offline). Cloudinary images use stale-while-revalidate. API routes, Supabase auth requests, and map tiles are network-only. The service worker is bundled at build time by `@serwist/next` from `app/sw.ts` and served at `/sw.js`. No runtime-generated caching rules are added client-side.
