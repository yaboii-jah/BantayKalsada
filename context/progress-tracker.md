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

- Auth pages (login, register, reset-password) — built.
- Browse page with empty state — built.
- Route protection via proxy.ts — built.
- Hallmark design principles applied (utilitarian tone, token discipline, mobile-first, no AI slop).

## Next Up

- Landing page polish (`/`)
- Report submission form
- Admin panel
- Report feed with actual data

## Open Questions

- None.

## Architecture Decisions (new)

- **Auth gradient** — `bg-auth-gradient` utility added to `globals.css`: a subtle three-stop gradient using project OKLCH tokens (light blue to white to light indigo).
- **Auth card layout** — `components/auth/auth-card.tsx` contains the split layout: branding panel (left 45%) + form (right 55%) on desktop, stacked on mobile. The card IS the container (no nested cards).
- **Branding panel** — `components/auth/branding-panel.tsx` shows logo, tagline, and feature highlights on a subtle primary-tinted background. Hidden on mobile; replaced with a minimal footer note in the form column.
- **ErrorMessage handling** — `Alert` banner at top of form for Supabase errors. Inline Zod validation to be added with react-hook-form later (not installed yet).
- **proxy.ts route protection** — three rules added: (1) authenticated users on auth routes → `/browse`, (2) unauthenticated on protected routes → `/login` (with `?redirect=` param), (3) unverified on `/submit` → `/verify-email`.
- **Post-login redirect** — defaults to `/browse` (configurable via `DEFAULT_AUTH_REDIRECT` constant or env var in future).
- **/verify-email page** — standalone page outside route groups, uses same gradient background, explains user needs to verify before submitting.
- **Social login** — omitted from v1.

## Session Notes (new)

- Login page wraps `useSearchParams()` in `<Suspense>` per Next.js requirement.
- Reset-password page detects recovery token via `window.location.hash` in `useState` initializer (not `useEffect`) to avoid cascading renders lint error.
- Branding panel uses `lucide-react` ShieldCheck icon as logo placeholder — to be replaced with actual logo SVG when available.
- Browse empty state shows "No reports yet" with Map icon and CTA to `/submit` (protected by proxy.ts).
- Pre-existing lint error in `carousel.tsx` (Shadcn/ui component) ignored — not in scope.
