# AI Workflow Rules

## Approach

Build Bantay Kalsada incrementally using a spec-driven workflow. The context files — `project-overview.md`, `architecture.md`, `code-standards.md`, `data-model.md`, and `progress-tracker.md` — define what to build, how to build it, and the current state of progress. Always implement against these files. Do not infer, invent, or assume behavior that is not defined in them.

When the context files are silent on a detail, that is a signal to ask — not to guess. An incorrect assumption that is implemented, tested, and merged is harder to fix than a one-line clarification written before coding begins.

The development sequence follows the natural dependency order of the system: infrastructure and auth before reporting, reporting before moderation, moderation before the public feed, the public feed before notifications. Do not build a feature whose dependencies are not already verified and working.

---

## Scoping Rules

- Work on one feature unit at a time. A feature unit is a single, end-to-end slice of behavior: one screen, one API route, one data model change, or one integration.
- Prefer small, verifiable increments over large speculative changes. A change is too large if it cannot be verified by a human in under five minutes.
- Do not combine unrelated system boundaries in a single implementation step. The public feed and the admin queue are separate boundaries — implement and verify them independently.
- Do not implement a feature in its "final" form if a simpler version satisfies the current requirement. Build the minimum that passes the relevant success criterion in `project-overview.md`.
- Do not implement anything listed under **Out of Scope** in `project-overview.md`, even if it seems like a natural extension of what is being built.

---

## Feature Unit Sequence

Implement in this order. Do not advance to the next unit until the current one is verified end to end.

1. **Project scaffolding** — Next.js app, Tailwind, Shadcn/ui setup, Supabase project created, `@supabase/supabase-js` and `@supabase/ssr` installed, environment variables configured (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), Supabase server and browser client factories created in `lib/supabase/`, `middleware.ts` configured for session refresh, `npm run build` passes clean.
2. **Database schema** — All tables, relationships, and RLS policies defined in Supabase SQL migrations per `data-model.md`. Migrations applied via Supabase CLI. `profiles` table trigger created. TypeScript types generated via `supabase gen types typescript` and written to `types/database.types.ts`.
3. **Authentication** — Registration, email verification, login, logout, and password reset all working via Supabase Auth. Session readable server-side via `supabase.auth.getUser()`. `profiles` row created automatically on registration via database trigger. Role readable from `profiles` table using authenticated user's ID.
4. **Cloudinary integration** — Signed upload preset configured. `/api/uploads/sign` route working. Direct browser upload verified. URL returned and storable.
5. **Report submission** — Citizen-facing submission form with category, title, description, 1–3 photo upload, and map pin. `POST /api/reports` creates a `PENDING` report. Rate limiting enforced. Confirmation shown to user.
6. **Citizen report history** — `/my-reports` page listing the authenticated citizen's own reports with status badges. `/my-reports/[id]` showing full detail including rejection reason when applicable.
7. **Admin panel — pending queue** — `/admin/pending` listing all `PENDING` reports. Admin-only access enforced. Paginated. Each row links to the review page.
8. **Admin report review** — `/admin/reports/[id]` showing full report detail including submitter info, photos, and map. Approve and Reject (with reason) actions wired to their respective API endpoints.
9. **Admin report resolution** — `/admin/approved` list with "Mark as Resolved" action. `/api/admin/reports/[id]/resolve` endpoint. Status updates to `RESOLVED`.
10. **Admin dashboard** — `/admin` showing count cards for `PENDING`, `APPROVED`, `REJECTED`, and `RESOLVED` reports. No charts. Links to each queue.
11. **Public feed** — `/browse` listing all `APPROVED` and `RESOLVED` reports. Filter by category and status. Paginated. `/reports/[id]` public detail page with photo gallery and map.
12. **Email notifications** — Brevo integrated. Email templates created. Emails sent on: report approved, report rejected (with reason), report resolved.
13. **In-app notification center** — Bell icon in nav with unread badge, lazy-fetched dropdown, mark as read, mark all as read, per-item delete, clear all.

---

## When to Split Work

Split an implementation step if it combines any of the following:

- UI changes and API route changes that serve different pages or user roles (e.g. building the citizen form and the admin queue in the same step).
- Multiple unrelated API routes (e.g. report submission and notification delivery).
- A database schema change and the UI that consumes it — apply and verify the migration first, then build the UI.
- Any Leaflet map integration alongside other unrelated UI work — the `ssr: false` requirement makes map components a frequent source of build errors; isolate them.
- Behavior that is not clearly defined in the context files — resolve the ambiguity in the relevant context file before writing code.
- Any new third-party service integration (Cloudinary, Resend) alongside feature logic — verify the integration in isolation first.

If a change cannot be verified end to end in under five minutes, the scope is too broad — split it.

---

## Handling Missing Requirements

- Do not invent product behavior not defined in the context files.
- If a requirement is ambiguous (e.g. "what happens if a user submits exactly 5 reports — are they blocked on the 5th or the 6th?"), resolve it by adding an **Open Question** entry to `progress-tracker.md` and wait for a decision before implementing.
- If a requirement is missing entirely, add it as an open question in `progress-tracker.md`. Do not proceed with an assumption that affects the data model, API contract, or access control behavior.
- If two context files appear to contradict each other, flag the conflict in `progress-tracker.md` and do not implement until the conflict is resolved. `architecture.md` takes precedence over `project-overview.md` on technical decisions. `project-overview.md` takes precedence on product behavior and scope.

---

## Protected Files

Do not modify the following unless explicitly instructed:

- `components/ui/*` — These are Shadcn/ui components added via the CLI. They are treated as library code. Customize behavior by wrapping them, not by editing them directly.
- `supabase/migrations/*` — Never edit an existing migration file. All schema changes are made by running`supabase migration new <name>` to generate a new file, then writing the SQL inside it. Editing a migration that has already been applied corrupts the migration history.
- `types/database.types.ts` — Never edit this file by hand. It is generated by the Supabase CLI (`supabase gen types typescript --local > types/database.types.ts`) and must be regenerated whenever the database schema changes.
- `.env` and `.env.local` — Never commit these files. Never hardcode values from them in source code. Access environment variables only through a validated config object or directly via `process.env` in server-side code. The `SUPABASE_SERVICE_ROLE_KEY` must only ever appear in server-side code — never in any file that could be bundled for the browser.
- `next.config.js` / `tailwind.config.ts` / `tsconfig.json` — Do not change compiler or framework configuration without an explicit instruction. In particular, do not weaken TypeScript strict mode.

---

## Keeping Docs in Sync

Update the relevant context file whenever implementation introduces a change to:

- **System architecture or boundaries** — update `architecture.md` (e.g. a new folder is added, a new service is integrated, a boundary responsibility changes).
- **Data model** — update `data-model.md` (e.g. a field is added, renamed, or a relationship changes).
- **Code conventions or standards** — update `code-standards.md` (e.g. a new pattern is established, a new library is adopted).
- **Feature scope** — update `project-overview.md` In Scope or Out of Scope lists if a product decision changes during implementation.
- **Progress** — update `progress-tracker.md` after every completed feature unit, every open question added, and every decision made.

If an implementation decision deviates from what the context files say — even for a good reason — document the deviation and the reason in `progress-tracker.md` before committing. Undocumented deviations cause confusion in future sessions because the context files no longer reflect the actual codebase.

---

## Before Moving to the Next Unit

Do not mark a unit complete or begin the next one until all of the following are true:

1. The current feature unit works end to end within its defined scope — the happy path functions correctly and the primary error cases (missing input, unauthorized access, invalid data) are handled.
2. No invariant defined in `architecture.md` was violated — specifically: report status filters are applied via RLS at the database level, photos never pass through Next.js API routes, the Supabase server client is created per request using the factory in `lib/supabase/server.ts` and never as a module-level singleton, Leaflet is loaded client-side only via `next/dynamic` with `{ ssr: false }`, admin routes verify role from the `profiles` table server-side independently of middleware, and report status transitions use dedicated endpoints with hard-coded target statuses.
3. `progress-tracker.md` has been updated to reflect the completed unit.
4. `npm run build` passes with zero errors and zero TypeScript errors.
5. No `any` type, `console.log`, commented-out code block, or hardcoded secret exists in the files touched during this unit.
