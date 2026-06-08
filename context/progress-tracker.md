# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

- [x] Design System — Complete

## Current Goal

- Scaffold app structure with routing, landing page, auth, and admin layout

## Completed

- [x] Initialize shadcn/ui with Radix base (Nova preset)
- [x] Install all required UI components: Button, Input, Textarea, Select, Label, Card, Badge, Dialog, Table, Separator, Sheet, DropdownMenu, Avatar, Skeleton, Alert, Sonner, Tooltip, Carousel, Field (form family)
- [x] Install lucide-react
- [x] Create `lib/utils.ts` with `cn()` helper
- [x] Update `app/globals.css` with project design tokens (colors from ui-context.md + report status tokens)
- [x] Update `app/layout.tsx` — replace Geist with Inter, add JetBrains Mono, wrap with TooltipProvider
- [x] Build passes with zero errors; all components import cleanly

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

## Session Notes

- shadcn initialized with `--base radix --template next --preset Nova`.
- "Form family" maps to the new `Field` component (Field, FieldLabel, FieldDescription, FieldError, FieldGroup, FieldSet, FieldLegend, FieldContent) — the legacy `form` component no longer exists in this shadcn version.
- `components/ui/` files are not modified per spec rules.
