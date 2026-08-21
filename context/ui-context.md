# UI Context

## Theme

Dark-only theme. No theme toggle and no light mode — the `:root` tokens are the dark palette (`color-scheme: dark`) and `<html>` carries the `dark` class so shadcn `dark:` variant utilities resolve. The design language is a clean civic public service aesthetic — medium-dark slate backgrounds (not near-black), matching muted surfaces, high-contrast text, and a trustworthy blue primary accent. The tone is accessible and neutral: this is a public safety tool used by a broad, non-technical Filipino audience, not a developer tool or consumer entertainment product. Every visual decision should prioritize legibility, information clarity, and trust over decoration.

**Admin-only palette:** Admin routes re-declare the neutral tokens (background, card/popover, muted/secondary/accent, border/input, sidebar) under `body.admin-theme` in `app/globals.css` as a deep blue-tinted near-black (`oklch(0.16 0.015 262)` background) — a deliberate brand refresh that separates the admin workspace from the citizen side. `--primary` (blue), `--status-*`, and `--destructive` are intentionally unchanged. The class is applied to `<body>` by `components/admin/admin-theme.tsx` (mounted in `app/admin/layout.tsx`); because custom properties cascade, this also covers portalled UI (Dialogs, `InlineSelect`, Sonner toasts, Tooltips) that mount to `document.body`. Non-admin routes never carry the class.

---

## Colors

All components must use these CSS custom property tokens. No hardcoded hex values anywhere in the codebase. These tokens are defined in `app/globals.css` and extend Shadcn/ui's default theme variables.

### Base Tokens

| Role             | CSS Variable          | Tailwind Equivalent      | Value     |
| ---------------- | --------------------- | ------------------------ | --------- |
| Page background  | `--background`        | `bg-background`          | `#FFFFFF` |
| Surface (cards)  | `--card`              | `bg-card`                | `#F8FAFC` |
| Primary text     | `--foreground`        | `text-foreground`        | `#202020` (neutral `oklch(0.13 0 0)`) |
| Muted text       | `--muted-foreground`  | `text-muted-foreground`  | `#64748B` |
| Primary accent   | `--primary`           | `bg-primary`             | `#1D4ED8` |
| Primary text on accent | `--primary-foreground` | `text-primary-foreground` | `#FFFFFF` |
| Border           | `--border`            | `border-border`          | `#E2E8F0` |
| Input background | `--input`             | `bg-input`               | `#F1F5F9` |
| Error / Danger   | `--destructive`       | `bg-destructive`         | `#DC2626` |
| Muted surface    | `--muted`             | `bg-muted`               | `#F1F5F9` |

### Report Status Tokens

These are project-specific tokens added to `app/globals.css` for use exclusively in the `ReportStatusBadge` component and status-related UI. Do not use these tokens for anything unrelated to report status.

| Status      | CSS Variable           | Value     | Usage                          |
| ----------- | ---------------------- | --------- | ------------------------------ |
| `PENDING`   | `--status-pending`     | `#f59e0b` | Amber — awaiting admin review  |
| `APPROVED`  | `--status-approved`    | `#22c55e` | Green — publicly visible       |
| `REJECTED`  | `--status-rejected`    | `#ef4444` | Red — declined by admin        |
| `RESOLVED`  | `--status-resolved`    | `#3b82f6` | Calm blue — issue addressed    |

Status badge backgrounds use a 10% opacity version of the status color (`--status-[name]/10`) with the full-opacity color for text and border.

### Heatmap Gradient (Allowed Color Exception)

The browse-map heatmap (`components/maps/heat-layer.tsx`) renders a continuous blue → cyan → amber → orange → red ramp. This is an **explicit exception** to the "no hardcoded hex" rule: a heatmap requires a continuous color scale that CSS custom-property tokens cannot express. It follows the same precedent as the `TaytayBoundary` polygon fill (`#0d9488`), which is also hardcoded. The in-map Markers/Heatmap toggle uses only standard tokens (`bg-card`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `text-primary-foreground`) and introduces no new tokens.


---

## Typography

| Role       | Font         | CSS Variable    | Next.js Font          |
| ---------- | ------------ | --------------- | --------------------- |
| UI text    | Inter        | `--font-sans`   | `next/font/google`    |
| Monospace  | JetBrains Mono | `--font-mono` | `next/font/google`    |

Inter is chosen for its exceptional legibility at small sizes, broad language support (important for Filipino text), and its established use in civic and government-adjacent products. JetBrains Mono is used only for displaying coordinate values, report IDs, or any other technical data fields — not for body text.

Font loading: Both fonts are loaded via `next/font/google` in `app/layout.tsx` and applied as CSS variables on the `<html>` element. Never import fonts via a `<link>` tag or from a `@import` in CSS.

---

## Border Radius

| Context              | Tailwind Class  | Usage                                                |
| -------------------- | --------------- | ---------------------------------------------------- |
| Inline / small UI    | `rounded-md`    | Badges, tags, small buttons, input fields            |
| Cards / panels       | `rounded-lg`    | Report cards, info panels, admin queue rows          |
| Modals / overlays    | `rounded-xl`    | Rejection reason modal, confirmation dialogs         |
| Map container        | `rounded-lg`    | Leaflet map wrapper on report form and detail page   |
| Photo thumbnails     | `rounded-md`    | Individual photo previews in upload widget and gallery |

---

## Component Library

Shadcn/ui on top of Tailwind CSS. All interactive UI primitives (buttons, inputs, selects, textareas, dialogs, toasts, tables, dropdowns) come from Shadcn/ui and live in `components/ui/`. 

- Add new Shadcn/ui components via the CLI (`npx shadcn-ui@latest add [component]`) — never write them from scratch.
- Do not edit files inside `components/ui/` directly. Wrap and extend them in `components/reports/`, `components/admin/`, or the relevant feature folder.
- Toast notifications for user feedback (report submitted, action successful, error occurred) use the Shadcn/ui `Sonner` toast component.
- The rejection reason prompt uses the Shadcn/ui `Dialog` component — not a native browser `confirm()`.
- All form fields use Shadcn/ui `Input` and `Textarea` components wired to `react-hook-form` with Zod resolvers for validation feedback. Custom dropdowns (`InlineSelect`) replace Shadcn/ui `Select` — they render options via `createPortal` to `document.body` to avoid container clipping, use `bg-background text-foreground` for reliable dark mode cascade, and are shared across report-form, feedback-form, and filter-bar. `InlineSelect` accepts an optional `id` prop that lands on the trigger button and is linked to its `Label` via `aria-labelledby`, so `Label htmlFor="…"` associates correctly.

---

## Layout Patterns

### Public Pages (Guest and Citizen)

- **Navbar**: Fixed top bar, full width, white background, bottom border (`border-border`). Contains the Bantay Kalsada logo/wordmark on the left, and primary navigation links + auth buttons on the right. Height: `h-16`. On mobile, navigation collapses into a Shadcn/ui `Sheet` (drawer) triggered by a hamburger icon.
- **Page background**: A very faint radial glow (`bg-radial-glow`) washes from the top-center of the `<main>` element on all user-facing routes — `(public)` and `(citizen)` — and on the admin main content area. Uses a `radial-gradient(ellipse at 50% 0%, oklch(0.488 0.243 264 / 0.06) 0%, transparent 60%)` — a subtle primary-tinted highlight that adds a hint of depth without competing with content. Not applied to auth layouts.
- **Page container**: Centered, `max-w-7xl`, horizontal padding `px-4 sm:px-6 lg:px-8`. All public pages use this container.
- **Public feed**: Responsive card grid — 1 column on mobile, 2 at `sm`, 3 at `lg`, 4 at `xl`, 5 at `2xl`. Report cards are equal height within their row. Filter bar sits above the grid as a single horizontal row of dropdowns with a result count. Filtering is driven by URL search params (`?category=&status=&page=`).
- **Report detail page**: Single centered column, `max-w-3xl`. Photo gallery above the fold, map below the description, metadata (category, date, status) displayed as a sidebar panel on desktop and stacked below the description on mobile. Comment section (`CommentSection` client component) rendered below the location map — any logged-in user can view and post comments; unauthenticated visitors see a "Sign in to leave a comment" prompt.
- **Footer**: Shared `PublicFooter` component (`components/public-footer.tsx`) rendered by both `(public)` and `(citizen)` layouts — no inline footers. Ft2-style: single row with wordmark (Map icon + "Bantay Kalsada"), a Browse link, legal/help links (About, Guidelines, Privacy, Terms, Disclaimer), and `© {year}`. Stacks vertically on mobile.
- **Static content pages** (About, Privacy, Terms, Guidelines, Disclaimer): `components/public/content-page.tsx` provides three presentational helpers — `ContentPage` (centered `max-w-3xl`, title + optional intro + `Last updated`, stacked sections), `ContentSection` (rounded-lg `border-border` card with `bg-card`, `text-sm` body in `text-muted-foreground`), and `ContentList` (`list-disc` with `space-y-1.5`). Tokens only, no inline hex. Each page exports `metadata` and is a static prerendered route.

### Report Submission Form

- Single centered column, `max-w-2xl`. Full-page scroll — not a multi-step wizard in MVP.
- Field order: Category → Title → Description → Photos → Location (map).
- Photo upload widget sits between the description textarea and the map. It shows a dropzone when no photos are uploaded, and a row of thumbnail previews with individual remove buttons once photos are attached.
- The map container has a fixed height of `h-[400px]` and `rounded-lg` corners. A "Use My Location" button floats above the top-left corner of the map.
- When a location is pinned, nearby APPROVED/RESOLVED reports appear as severity-colored chip markers (white pill with colored dot + distance, colored border matching severity level). Tapping a chip opens a Leaflet popup with photo thumbnail, title, severity badge, status badge, distance, date, and a "View full details →" link. Moving the pin clears and re-fetches.
- The Submit button is full-width, pinned to the bottom of the form, and uses the `--primary` color. It is disabled and shows a loading spinner while the form is submitting.

### Admin Panel

- **Layout**: Two-column split. Left sidebar: fixed width `w-64`, deep blue-tinted surface (`bg-muted` under `body.admin-theme`), right border (`border-border`), full viewport height. Main content area: fills remaining width, deep blue-tinted background with the same faint radial glow as the user side (`bg-background bg-radial-glow`), scrollable. The admin palette (see Theme) is scoped to `<body>` so dialogs/popovers/toasts match too; the blue accent and status colors are shared with the user side unchanged.
- **Sidebar toggle**: The admin sidebar can be collapsed/re-expanded via `components/admin/admin-shell.tsx` (client wrapper mounted in `app/admin/layout.tsx`). A `PanelLeftClose` button in the sidebar header hides the rail; while hidden, a slim top bar (`border-b border-border bg-muted`) shows the `ShieldCheck` logo + "Bantay Kalsada" wordmark on the left and a `PanelLeftOpen` reopen button on the right above the content. The collapsed preference persists across sessions via `localStorage["bk-admin-sidebar-hidden"]` (read through `useSyncExternalStore`, mirroring `install-prompt.tsx`).
- **Mobile sidebar drawer**: Below `lg`, the admin sidebar never pushes content — it renders as an overlay drawer (`fixed inset-y-0 left-0 z-[1250] w-64`, slide-in/out) over a `bg-black/60` backdrop (`z-[1200]`). A sticky top bar (`sticky top-0 z-[1100]`) is always visible on mobile with the logo + wordmark left and a lucide `Menu` hamburger right (mirrors the citizen nav layout). The drawer closes on backdrop tap, its `PanelLeftClose` button, or any nav link / sign-out click (`onNavigate`). Pure CSS breakpoints + transient `mobileOpen` state (hydration-safe, no matchMedia). Admin `<main>` uses `p-4 sm:p-6`.
- **Admin dashboard**: The dashboard (`/admin`) is dynamic (`export const dynamic = "force-dynamic"`) and computes analytics via aggregate RPCs (`count_reports_by_status()`, `daily_submissions_since()`, `count_reports_by_category()`, `count_reports_by_barangay()`, `avg_resolution_hours()`, `count_reports_since()` — migration `20260820000001`), falling back to a full-table in-JS aggregation if the RPCs aren't applied yet. Charts load via `components/admin/analytics-charts-lazy.tsx` — `next/dynamic` `ssr:false` recharts behind a pulse skeleton, so recharts isn't in the initial admin bundle.
- **Admin queue navigation loading**: Pagination and filter/search navigation on the 4 queue pages (`pending`/`approved`/`rejected`/`resolved`) is handled by `components/admin/admin-list-pending.tsx` — a `useTransition`-driven client wrapper that shows a table-shaped skeleton (`components/admin/admin-list-skeleton.tsx`, pulse bars matching the table columns) while the next page/filter loads, keeping the pagination bar visible with the current page highlighted. The queue title search (and the `/browse` keyword search) filters **realtime** — debounced 400ms as-you-type, Enter still instant (2026-08-20).
- **Admin queue header + filter bar (mobile)**: On screens below `sm`, each queue page renders a stacked toolbar — one row with the truncating page title + count left and Export CSV right, then a full-width search input, then a 50/50 grid of the category/barangay selects (Clear spans both columns when active). From `sm` up the filter bar reverts to a single wrapped row. The feedback inbox `h1` follows the same one-row title treatment.
- **Sidebar navigation**: Vertical list of links — Dashboard, Pending (with a count badge), Approved, Rejected, Resolved, Feedback. Active link uses `bg-primary/10` background with `text-primary` color. Count badge on Pending uses `--status-pending` color.
- **Admin report queue**: Full-width table using Shadcn/ui `Table`. Columns: Submitter name, Category, Title (truncated), Submitted date, Action link. Rows are clickable and navigate to the review page. On small screens low-priority columns collapse instead of forcing page-level overflow: Barangay hides below `sm`, Category below `md`, Rejection Reason below `lg` (header + cells kept in sync via `hidden … table-cell`). The admin content column in `admin-shell.tsx` carries `min-w-0` so wide tables never expand the layout past the viewport (with `body { overflow-x: clip }` they would otherwise be cropped with no sideways scroll); remaining columns scroll horizontally inside the card via the Table's built-in `overflow-x-auto`. The feedback inbox table hides its Type column below `sm` and only enforces `min-w-[640px]` from `sm` up (`w-full sm:min-w-[640px]`).
- **Admin report review page**: Single centered column, `max-w-4xl`. Shared `BackButton` (`router.back()`, fallback `/admin/pending`) at the top. Report detail displayed above the action buttons. Approve and Reject buttons are side by side at the bottom, right-aligned; below `sm` the action bar stacks full-width rows (Duplicate manager / Unlink, Edit report, then Approve | Reject at 50/50) with `pt-4 pb-2` spacing against the `border-t` divider. Approve uses the success color; Reject uses the destructive color.
- **Admin feedback review page**: Single centered column, `max-w-4xl`. Feedback detail displayed with type badge, status badge, description, optional photo gallery. Admin note editor sits below the description with a textarea, Save button, and optional Remove note button. Acknowledge and Close action buttons at the bottom, right-aligned.
- **Rejection modal**: Shadcn/ui `Dialog`, centered, `max-w-md`. Contains a textarea for the rejection reason (required), a character count, and Confirm / Cancel buttons.

### PWA Install Banner

- Rendered in `app/(public)/layout.tsx` as a sticky bottom bar (`fixed inset-x-0 bottom-0 z-[1300]`) with `bg-card` and `border-t border-border`.
- Contains a `Download` icon in a `bg-primary/10` container, the text "Install Bantay Kalsada" with subtitle "Add to your home screen for quick access", an "Install" button, and an X dismiss button.
- Only visible when the `beforeinstallprompt` event fires and the app is not already in standalone mode. Hidden once dismissed, installed, or in incognito (browser blocks the event).
- Not rendered in admin or auth layouts — public pages only.

### Modals and Overlays

- Centered in the viewport with a semi-transparent backdrop (`bg-black/50`).
- Use Shadcn/ui `Dialog` for all modal interactions — do not use browser-native dialogs.
- Confirmation dialogs (approve, resolve) are concise: a one-sentence prompt and two buttons (Confirm, Cancel).

---

## Icons

Lucide React — already included as a Shadcn/ui dependency, no additional installation required.

- **Inline icons** (inside text, labels, badges): `h-4 w-4`
- **Button icons** (leading icon in a button): `h-4 w-4`, `mr-2` margin
- **Navigation icons** (admin sidebar): `h-5 w-5`
- **Empty state icons**: `h-12 w-12`, `text-muted-foreground`
- **Status icons in badges**: `h-3 w-3`

### Icon Reference for Common Actions

| Action / State       | Lucide Icon           |
| -------------------- | --------------------- |
| Submit report        | `Send`                |
| Upload photo         | `ImagePlus`           |
| Remove photo         | `X`                   |
| Use GPS location     | `LocateFixed`         |
| Approve report       | `CheckCircle`         |
| Reject report        | `XCircle`             |
| Resolve report       | `CheckCheck`          |
| Pending status       | `Clock`               |
| Filter               | `SlidersHorizontal`   |
| Admin dashboard      | `LayoutDashboard`     |
| My reports           | `FileText`            |
| Notification bell (no unread) | `Bell`       |
| Notification bell (unread)    | `BellRing`     |
| Browse / public feed | `Map`                 |
| Feedback (general)   | `MessageSquare`       |
| Feedback (bug report)| `Bug`                 |
| Feedback (feature)   | `Lightbulb`           |
| Rating star          | `Star`                |
| Acknowledge feedback | `CheckCircle`         |
| Close feedback       | `XCircle`             |
| Save note            | `Save`                |
| Remove note          | `Trash2`              |
| Logout               | `LogOut`              |
| Share report         | `Share2`              |
| Install PWA          | `Download`            |
| Comment              | `MessageCircle`       |
| Comment menu         | `MoreHorizontal`      |
| Edit comment         | `Pencil`              |
| Delete comment       | `Trash2`              |
| Remove comment (admin) | `ShieldAlert`       |

---

## Responsive Behavior

- All public-facing pages are mobile-first. The primary user device is a smartphone — a citizen encountering a road hazard will report it from their phone.
- The report submission form is fully usable on mobile. The map must be touch-interactive (Leaflet supports this by default). Photo upload must work with the device camera.
- The admin panel is desktop-first. Administrators are expected to work from a laptop or desktop. The admin layout does not need to be fully optimized for mobile in MVP — a functional, if not perfectly responsive, layout is acceptable.
- Breakpoints follow Tailwind's defaults: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px).
