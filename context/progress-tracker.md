# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

- [x] Design System — Complete
- [x] Supabase Auth — Complete

## Current Goal

- Scaffold app structure with routing, landing page, auth, and admin layout

## Completed

### Design System

- [x] Initialize shadcn/ui with Radix base (Nova preset)
- [x] Install all required UI components: Button, Input, Textarea, Select, Label, Card, Badge, Dialog, Table, Separator, Sheet, DropdownMenu, Avatar, Skeleton, Alert, Sonner, Tooltip, Carousel, Field (form family)
- [x] Install lucide-react
- [x] Create `lib/utils.ts` with `cn()` helper
- [x] Update `app/globals.css` with project design tokens (colors from ui-context.md + report status tokens)
- [x] Update `app/layout.tsx` — replace Geist with Inter, add JetBrains Mono, wrap with TooltipProvider

### Supabase Client & Auth

- [x] Install `@supabase/supabase-js` and `@supabase/ssr`
- [x] Create `lib/supabase/server.ts` — per-request server client factory using `createServerClient` with cookie handling
- [x] Create `lib/supabase/client.ts` — browser client singleton using `createBrowserClient`
- [x] Create `lib/supabase/middleware.ts` — `updateSession()` helper for session refresh in proxy
- [x] Create `proxy.ts` — Next.js 16 proxy file (replaces deprecated `middleware.ts`) that calls `updateSession` on every request to refresh Supabase auth cookies
- [x] Fix `.env.local` — demote `SUPABASE_SERVICE_ROLE_KEY` from `NEXT_PUBLIC_` to server-only
- [x] Build passes with zero errors; no deprecation warnings

## In Progress

- None yet.

## Next Up

- Feature routes and pages (landing, report submission, admin panel)

## Open Questions

- None.

## Architecture Decisions

- **shadcn/ui Nova preset** — chosen for its Radix-based primitives, Tailwind v4 compatibility, and accessible defaults. Matches the civic/public-service design language.
- **No dark mode in MVP** — tokens only define `:root` light colors; dark class not used.
- **Status tokens as CSS custom properties** — enables 10% opacity backgrounds via `color-mix()` or `--status-*/10` in status badges.
- **Supabase SSR pattern** — three client factories follow the standard `@supabase/ssr` pattern: `server.ts` (per-request `createServerClient` with `next/headers` cookies), `client.ts` (module-level `createBrowserClient` singleton), and `middleware.ts` (request-scoped `createServerClient` with cookie passthrough for proxy refresh).
- **proxy.ts over middleware.ts** — Next.js 16 deprecates `middleware.ts` in favor of `proxy.ts`. The API is identical; only the file name and export name change.
- **Service role key kept server-only** — `NEXT_PUBLIC_` prefix removed from `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` to prevent accidental client-side exposure.

## Session Notes

- shadcn initialized with `--base radix --template next --preset Nova`.
- "Form family" maps to the new `Field` component (Field, FieldLabel, FieldDescription, FieldError, FieldGroup, FieldSet, FieldLegend, FieldContent) — the legacy `form` component no longer exists in this shadcn version.
- `components/ui/` files are not modified per spec rules.
- Supabase client factories use the standard `@supabase/ssr` v1.x API (`createServerClient`, `createBrowserClient`).
- The `updateSession` function in `lib/supabase/middleware.ts` is imported by `proxy.ts` which runs on every matched route to refresh the Supabase auth session cookie.
