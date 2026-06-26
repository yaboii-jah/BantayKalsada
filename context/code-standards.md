# Code Standards

## General

- Keep every module, component, and route handler small and single-purpose. If a file is doing more than one thing, split it.
- Fix root causes. Do not add conditional checks, flags, or workarounds to mask a broken assumption — fix the assumption.
- Do not mix unrelated concerns in a single file. A report form component does not send emails. An API route handler does not render UI.
- Prefer explicit over implicit. Name variables, functions, and types after what they actually do, not what they contain (e.g. `approveReport` not `handleClick`, `ReportStatusBadge` not `Badge2`).
- Delete code that is no longer used. Do not comment it out and leave it.
- Never leave `TODO`, `FIXME`, or `console.log` statements in committed code unless the TODO is tracked in an issue and the comment references it.

---

## TypeScript

- Strict mode is required. `tsconfig.json` must have `"strict": true` and it must never be weakened.
- Never use `any`. If the shape of data is unknown, use `unknown` and narrow it with a Zod schema before use.
- Never use type assertions (`as SomeType`) as a substitute for proper validation. Assertions are acceptable only when TypeScript cannot infer a type that is provably correct from context.
- All shared data shapes that cross a system boundary — form inputs, API request bodies, API responses, database query results passed to the client — must have an explicit TypeScript interface or type alias defined in `lib/validations/` or `types/`.
- Zod schemas are the single source of truth for input shapes. Derive TypeScript types from Zod schemas using `z.infer<typeof schema>` — do not maintain a separate interface that duplicates a schema.
- Avoid non-null assertions (`!`). If a value can be null or undefined, handle both cases explicitly.
- Use `satisfies` over `as` where possible when annotating object literals — it catches excess property errors while preserving the inferred type.
- Database types are generated via the Supabase CLI (`supabase gen types typescript --local > types/database.types.ts`). Always use these generated types when reading from or writing to Supabase tables — do not manually define types that duplicate the database schema.

---

## Next.js (App Router)

- Default to Server Components. Add `"use client"` only when a component requires browser APIs, React state (`useState`), effects (`useEffect`), or event handlers that cannot be handled server-side.
- Never import Leaflet, React Leaflet, or any other browser-only library in a Server Component. These components must live in files marked `"use client"` and must be loaded via `next/dynamic` with `{ ssr: false }` at their usage site.         
- Route handler files (`route.ts`) contain only the HTTP handler functions (`GET`, `POST`, `PATCH`, `DELETE`). Business logic lives in separate service functions in `lib/` or `services/` — route handlers call those functions, they do not contain the logic inline.
- Each route handler handles exactly one HTTP concern. Do not combine unrelated logic (e.g. fetching reports and sending emails) inside a single handler function — extract each into a named function.
- Use Next.js `middleware.ts` for lightweight, fast-path access control (redirect unauthenticated users away from protected routes). Middleware is a UX guard only — it must not be the sole authorization check. Every protected API route independently verifies auth and role server-side.
- Never call `redirect()` inside a `try/catch` block in a Server Component or Server Action — it throws internally and will be silently swallowed.
- Loading states for async Server Components are handled via `loading.tsx` files co-located with the route segment. Do not implement spinner logic inside page components.
- Error boundaries are handled via `error.tsx` files co-located with the route segment. Do not implement try/catch error UI inside page components.

---

## Styling

- Use Tailwind utility classes for all layout, spacing, typography, and color. Do not write custom CSS unless Tailwind cannot express the style.
- Use the Shadcn/ui component primitives for all interactive UI: buttons, inputs, selects, textareas, modals/dialogs, toasts, and tables. Do not build custom versions of components that Shadcn/ui already provides.
- Do not hardcode color hex values anywhere. Use Tailwind's semantic color tokens (`bg-primary`, `text-muted-foreground`, `border-destructive`, etc.) which are wired to the CSS custom properties defined by Shadcn/ui's theme.
- Status badges for report statuses (`PENDING`, `APPROVED`, `REJECTED`, `RESOLVED`) must use a single shared `ReportStatusBadge` component. Do not inline status color logic in multiple places.
- The admin panel layout is visually distinct from the citizen-facing layout. Admin pages use a separate root layout (`app/admin/layout.tsx`) with a sidebar navigation — they must not share the public-facing header or navigation component.
- All interactive elements must be keyboard accessible. Use Shadcn/ui primitives, which are built on Radix UI and handle accessibility by default. Do not replace them with plain `div` elements that handle click events.

---

## API Routes

- The first thing every route handler does is authenticate the request. Create a Supabase server client using the factory in `lib/supabase/server.ts` and call `supabase.auth.getUser()`. If the returned `user` is null or an error is returned, respond with a `401` immediately — no further logic runs. Never use `getSession()` for server-side auth checks; it reads from the cookie without revalidating and is not trustworthy for authorization.
- The second check is authorization. For admin-only routes, query the `profiles` table for the authenticated user's `role` and confirm it equals `ADMIN`. For citizen-only routes that require a verified email (e.g. submitting a report), confirm `user.email_confirmed_at` is not null. If either check fails, return a `403` immediately. These checks run before any business logic.
- The third step is input validation. Parse the request body (or query params) against the relevant Zod schema. If validation fails, return a `400` with the Zod error details. No database query runs before input is validated.
- All API responses follow a consistent shape:
  - Success: `{ success: true, data: <payload> }` with the appropriate 2xx status code.
  - Error: `{ success: false, error: "<human-readable message>" }` with the appropriate 4xx or 5xx status code.
- Never return sensitive fields in API responses. Do not expose other users' email addresses, internal user IDs beyond what the client needs, or any fields from `auth.users` directly — always return data from the `profiles` table or application-owned tables only.
- Never accept `status`, `role`, or `submitted_by_id` as free-form values from a request body and write them directly to the database. These fields are always set by server-side logic, never by the client.
- Rate limiting for report submission is enforced inside `POST /api/reports` by counting the authenticated user's submissions in the last 24 hours via a Supabase query. If the count is 5 or more, return a `429` before any insertion runs.

---

## Data and Storage

- All structured application data (profiles, reports, notifications) is stored in Supabase PostgreSQL and accessed exclusively through the Supabase client created by the factory in `lib/supabase/server.ts` (server-side) or `lib/supabase/client.ts` (client-side). No direct PostgreSQL connections or query builders outside of these clients are permitted.
- Never interact with the `auth.users` table directly from application code. User identity data (ID, email, `email_confirmed_at`) is read from the object returned by `supabase.auth.getUser()`. Display name and role are read from the `profiles` table using the authenticated user's ID.
- Photo files (binary content) are never stored in Supabase. The database stores only the Cloudinary URL and public ID strings for each photo. A report's photos are stored as a `text[]` array of URLs on the report record.
- Photos are never proxied through Next.js API routes. The browser generates a signature by calling `/api/uploads/sign`, uploads directly to Cloudinary, and sends back only the resulting URL array when submitting the report form.
- Transactional email for report status notifications (approved, rejected, resolved) is sent exclusively through the Brevo client in `lib/email.ts`. No other file calls Brevo directly. Auth emails (verification link, password reset link) are sent by Supabase Auth automatically — do not replicate them with Brevo.
- Never use raw SQL string interpolation in Supabase queries. If a use case requires a raw query beyond the Supabase client's query builder (e.g. full-text search), use a Supabase database function (RPC) called via `supabase.rpc()` — this keeps query logic in the database layer and avoids injection risks.

---

## File Organization

- `app/` — Next.js App Router pages, layouts, loading states, and error boundaries. Route groups `(public)`, `(auth)`, and `(citizen)` enforce layout boundaries and access tiers. `app/admin/` is the admin panel. `app/api/` contains all API route handlers.
- `components/` — Shared React components, organized by concern: `components/ui/` for Shadcn/ui primitives, `components/maps/` for Leaflet map components (all `"use client"`), `components/reports/` for report-specific UI (cards, forms, photo gallery, status badge), and `components/admin/` for admin-specific UI (queue table, rejection modal, action buttons).
- `lib/` — Shared utilities and Supabase client factories. `lib/supabase/server.ts` exports the per-request server client factory — nothing outside this file calls `createServerClient`. `lib/supabase/client.ts` exports the browser client. `lib/supabase/middleware.ts` exports the session refresh helper. Also contains `lib/email.ts` (Brevo client), `lib/cloudinary.ts` (signing helper), `lib/validations/` (all Zod schemas), and `lib/utils.ts` (shared helpers). Nothing in `lib/supabase/server.ts` is ever imported into a `"use client"` component.
- `emails/` — React Email template components for report status notifications only: `report-approved.tsx`, `report-rejected.tsx`, `report-resolved.tsx`. Auth email templates (verification, password reset) live in the Supabase dashboard — they are not maintained in this folder.
- `supabase/` — Supabase project configuration and schema. `supabase/migrations/` contains SQL migration files generated by the Supabase CLI — these files are never edited by hand after creation. `supabase/seed.sql` is the only authoritative place to create the initial admin profile record. `supabase/config.toml` holds local development configuration.
- `types/` — Shared TypeScript type definitions. `types/database.types.ts` is generated by the Supabase CLI and must not be edited by hand — regenerate it when the schema changes. Other files in this folder hold type aliases not derived from the database schema (e.g. Cloudinary response types, email payload types).
- `public/` — Static assets only (favicon, OG images, icons). No application logic.
