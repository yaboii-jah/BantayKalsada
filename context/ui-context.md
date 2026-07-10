# UI Context

## Theme

Light mode by default with full dark mode support via `next-themes`. Toggle switches between Light ↔ Dark (2-state); initial default respects `prefers-color-scheme` via `defaultTheme="system"`. The design language is a clean civic public service aesthetic — white page backgrounds, light gray surface layers, high-contrast text, and a trustworthy blue primary accent in light mode; inverted dark slate backgrounds (medium-dark, not near-black) with matching muted surfaces in dark mode. The tone is accessible and neutral: this is a public safety tool used by a broad, non-technical Filipino audience, not a developer tool or consumer entertainment product. Every visual decision should prioritize legibility, information clarity, and trust over decoration.

---

## Colors

All components must use these CSS custom property tokens. No hardcoded hex values anywhere in the codebase. These tokens are defined in `app/globals.css` and extend Shadcn/ui's default theme variables.

### Base Tokens

| Role             | CSS Variable          | Tailwind Equivalent      | Value     |
| ---------------- | --------------------- | ------------------------ | --------- |
| Page background  | `--background`        | `bg-background`          | `#FFFFFF` |
| Surface (cards)  | `--card`              | `bg-card`                | `#F8FAFC` |
| Primary text     | `--foreground`        | `text-foreground`        | `#0F172A` |
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
| `PENDING`   | `--status-pending`     | `#D97706` | Amber — awaiting admin review  |
| `APPROVED`  | `--status-approved`    | `#16A34A` | Green — publicly visible       |
| `REJECTED`  | `--status-rejected`    | `#DC2626` | Red — declined by admin        |
| `RESOLVED`  | `--status-resolved`    | `#2563EB` | Calm blue — issue addressed    |

Status badge backgrounds use a 10% opacity version of the status color (`--status-[name]/10`) with the full-opacity color for text and border.

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
- All form fields use Shadcn/ui `Input`, `Textarea`, and `Select` components wired to `react-hook-form` with Zod resolvers for validation feedback.

---

## Layout Patterns

### Public Pages (Guest and Citizen)

- **Navbar**: Fixed top bar, full width, white background, bottom border (`border-border`). Contains the Bantay Kalsada logo/wordmark on the left, and primary navigation links + auth buttons on the right. Height: `h-16`. On mobile, navigation collapses into a Shadcn/ui `Sheet` (drawer) triggered by a hamburger icon.
- **Page container**: Centered, `max-w-7xl`, horizontal padding `px-4 sm:px-6 lg:px-8`. All public pages use this container.
- **Public feed**: Responsive card grid — 1 column on mobile, 2 at `sm`, 3 at `lg`, 4 at `xl`, 5 at `2xl`. Report cards are equal height within their row. Filter bar sits above the grid as a single horizontal row of dropdowns with a result count. Filtering is driven by URL search params (`?category=&status=&page=`).
- **Report detail page**: Single centered column, `max-w-3xl`. Photo gallery above the fold, map below the description, metadata (category, date, status) displayed as a sidebar panel on desktop and stacked below the description on mobile.

### Report Submission Form

- Single centered column, `max-w-2xl`. Full-page scroll — not a multi-step wizard in MVP.
- Field order: Category → Title → Description → Photos → Location (map).
- Photo upload widget sits between the description textarea and the map. It shows a dropzone when no photos are uploaded, and a row of thumbnail previews with individual remove buttons once photos are attached.
- The map container has a fixed height of `h-[400px]` and `rounded-lg` corners. A "Use My Location" button floats above the top-left corner of the map.
- The Submit button is full-width, pinned to the bottom of the form, and uses the `--primary` color. It is disabled and shows a loading spinner while the form is submitting.

### Admin Panel

- **Layout**: Two-column split. Left sidebar: fixed width `w-64`, white background, right border (`border-border`), full viewport height. Main content area: fills remaining width, light gray background (`bg-muted`), scrollable.
- **Sidebar navigation**: Vertical list of links — Dashboard, Pending (with a count badge), Approved, Rejected, Resolved, Feedback. Active link uses `bg-primary/10` background with `text-primary` color. Count badge on Pending uses `--status-pending` color.
- **Admin report queue**: Full-width table using Shadcn/ui `Table`. Columns: Submitter name, Category, Title (truncated), Submitted date, Action link. Rows are clickable and navigate to the review page.
- **Admin report review page**: Single centered column, `max-w-4xl`. Report detail displayed above the action buttons. Approve and Reject buttons are side by side at the bottom, right-aligned. Approve uses the success color; Reject uses the destructive color.
- **Admin feedback review page**: Single centered column, `max-w-4xl`. Feedback detail displayed with type badge, status badge, description, optional photo gallery. Admin note editor sits below the description with a textarea, Save button, and optional Remove note button. Acknowledge and Close action buttons at the bottom, right-aligned.
- **Rejection modal**: Shadcn/ui `Dialog`, centered, `max-w-md`. Contains a textarea for the rejection reason (required), a character count, and Confirm / Cancel buttons.

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

---

## Responsive Behavior

- All public-facing pages are mobile-first. The primary user device is a smartphone — a citizen encountering a road hazard will report it from their phone.
- The report submission form is fully usable on mobile. The map must be touch-interactive (Leaflet supports this by default). Photo upload must work with the device camera.
- The admin panel is desktop-first. Administrators are expected to work from a laptop or desktop. The admin layout does not need to be fully optimized for mobile in MVP — a functional, if not perfectly responsive, layout is acceptable.
- Breakpoints follow Tailwind's defaults: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px).
