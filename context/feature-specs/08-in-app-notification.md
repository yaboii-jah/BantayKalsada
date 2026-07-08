# In-App Notification Center Implementation

## Design (Hallmark-informed)

- **Genre:** Utility — silent background service. Bell icon in nav, non-intrusive badge count, lazy-loaded dropdown. No page-level UI, no modal overlays.
- **Placement:** Desktop nav only (v1). The bell sits between "Browse reports" and the avatar dropdown in `PublicNav`. Hidden when unauthenticated.
- **Fetch strategy:** Lazy — notifications are NOT fetched on mount. The query fires on first click of the bell, matching GitHub/Twitter behavior. This avoids an unnecessary query for users who rarely check notifications.
- **Types:** Uses `TypeScript` types from `database.types.ts` — no new type definitions. The `notifications` table `Row` type is used directly: `Tables<"notifications">`.
- **Relative time:** Reuses `formatReportDate()` from `lib/date-utils.ts` — consistent display with report cards.
- **Icons per type:** `lucide-react` CheckCircle (approved), XCircle (rejected), CheckCheck/Resolve (resolved).
- **Colors:** Uses existing design tokens — no new CSS variables. Unread items use `font-medium` + left border accent; read items use normal font weight.
- **Read state visuals:** Unread: `bg-muted/50`, `border-l-2 border-primary`. Read: transparent background, `border-l-2 border-transparent`.

### Notification Types

Three notification types, each with a corresponding icon and color accent:

| Type | Icon | Color | Message Example |
|------|------|-------|-----------------|
| `REPORT_APPROVED` | `CheckCircle` | `text-status-approved` | "Your report '...' has been approved." |
| `REPORT_REJECTED` | `XCircle` | `text-status-rejected` | "Your report '...' has been rejected." |
| `REPORT_RESOLVED` | `CheckCheck` | `text-primary` | "Your report '...' has been marked as resolved." |

### Dropdown Layout

- **Width:** 360px (`w-80` base + `sm:w-96`)
- **Max height:** 320px with vertical scroll (`max-h-80 overflow-y-auto`)
- **Position:** Absolute, right-aligned below the bell, `top-full mt-2`
- **Shadow:** `shadow-lg ring-1 ring-foreground/10 rounded-lg bg-popover`
- **z-index:** `z-50` — above nav but below modals
- **Scrollbar:** Thin, styled via `scrollbar-thin` utility
- **Close triggers:** Click outside (mousedown listener), Escape key, clicking a notification, clicking "Mark all as read"

### States per Hallmark Discipline

**NotificationBell component (8 states):**

| # | State | Visual |
|---|-------|--------|
| 1 | **Loading** (initial fetch) | Spinner icon inside bell area |
| 2 | **Empty** (0 notifications) | Bell icon, no badge. Dropdown shows "No notifications yet" with CheckCheck icon |
| 3 | **Unread present** | BellRing icon with count badge (max `99+`). Badge: `bg-destructive text-destructive-foreground text-[10px]` |
| 4 | **All read** | Bell icon, no badge |
| 5 | **Dropdown open** | Panel visible, backdrop click-to-close |
| 6 | **Marking one as read** | Item dims briefly via `useTransition` |
| 7 | **Marking all as read** | "Mark all as read" button shows loading spinner |
| 8 | **Error during fetch** | Bell icon visible, no badge. Error silently logged — never blocks UX |

**Notification item (sub-states within dropdown):**

| # | State | Visual |
|---|-------|--------|
| 1 | **Unread** | `bg-muted/50`, left border primary, `font-medium` message |
| 2 | **Read** | Transparent bg, left border transparent, `text-muted-foreground` message |
| 3 | **Click pending** | `opacity-50`, pointer-events none (during `startTransition`) |

## Server Actions

### `markNotificationAsRead(notificationId: string)`

```
1. supabase.auth.getUser() — verify authenticated
2. supabase.from("notifications").update({ is_read: true })
     .eq("id", notificationId).eq("user_id", user.id)
3. Return { success: true }
```

Uses the anon-key server client (not service role). RLS policy `"Citizens can update own notifications"` enforces that the notification belongs to the current user. This is consistent with the codebase pattern: Server Actions for all mutations, auth check in every handler.

### `markAllNotificationsAsRead()`

```
1. supabase.auth.getUser() — verify authenticated
2. supabase.from("notifications").update({ is_read: true })
     .eq("user_id", user.id).eq("is_read", false)
3. Return { success: true }
```

Same auth + RLS pattern. Updates all unread notifications for the current user in a single query.

## Component Tree

```
PublicNav (client)
  ├── Browse reports link
  ├── NotificationBell (client, rendered only when user is authenticated)
  │     └── Fetches notifications lazily on first click
  │     └── Dropdown list of notification items
  │           ├── NotificationItem (unread)
  │           ├── NotificationItem (read)
  │           └── "Mark all as read" footer
  ├── Avatar dropdown (existing)
  └── Mobile sheet (existing, unchanged)
```

## Data Flow

```
Citizen opens app
  → PublicNav renders Bell icon (Bell if 0 unread, BellRing + badge if > 0)
  → Unread count fetched eagerly on mount (lightweight COUNT query)
  → Citizen clicks bell
    → NotificationBell lazy-fetches last 10 notifications
    → Dropdown opens with notification list
  → Citizen clicks notification item
    → startTransition: markNotificationAsRead(reportId)
      → Server Action: auth → update is_read=true
    → router.push("/my-reports/[reportId]")
  → Citizen clicks "Mark all as read"
    → markAllNotificationsAsRead()
      → Server Action: auth → update all user's unread is_read=true
    → Refetch notification count + list
```

## Edge Cases

- **0 notifications:** Bell icon, no badge. Dropdown shows "No notifications yet" + CheckCheck icon in muted text.
- **99+ unread:** Badge caps at `99+` to prevent layout overflow.
- **Network error during fetch:** Bell icon renders without badge. Error logged to console. User can try again by re-clicking bell.
- **Server Action fails:** Toast error via Sonner (optional). The notification remains unread — no data loss.
- **Notification for deleted report:** Rows cascade-delete when a report is deleted (FK constraint). Edge case handled by database.
- **Multiple tabs:** Each tab independently fetches. Marking as read in one tab doesn't update another until next fetch — acceptable for v1.
- **User logs out:** NotificationBell unmounts with the avatar section. No stale data.
- **Rapid double-click:** `startTransition` ensures the second click is queued. The transition marks the notification as read twice redundantly — harmless.

## Implementation

1. Add `markNotificationAsRead` + `markAllNotificationsAsRead` Server Actions to `app/actions.ts`
2. Create `components/notification-bell.tsx` — client component with all 8 states
3. Update `components/public-nav.tsx` — render NotificationBell when user is authenticated
4. Update `context/progress-tracker.md`
5. Write `context/feature-specs/08-in-app-notification.md`
6. Verify `npm run build` passes with zero errors

## Implementation Status

| Item | Status |
|---|---|
| `app/actions.ts` — `markNotificationAsRead` Server Action | ✅ Built |
| `app/actions.ts` — `markAllNotificationsAsRead` Server Action | ✅ Built |
| `components/notification-bell.tsx` — client component | ✅ Built |
| `components/public-nav.tsx` — NotificationBell integration | ✅ Built |
| `context/progress-tracker.md` — updated | ✅ Built |
| `context/feature-specs/08-in-app-notification.md` — written | ✅ Built |
| `components/notification-bell.tsx` — delete UI | ✅ Built |
| `context/progress-tracker.md` — updated | ✅ Built |
| `npm run build` passes with zero errors | ✅ Built |

## Check When Done

- [x] `markNotificationAsRead` Server Action authenticates + updates `is_read` via server client
- [x] `markAllNotificationsAsRead` Server Action updates all unread for the current user
- [x] `deleteNotification` Server Action — authenticates, deletes by `id` + `user_id` via service-role client
- [x] `clearAllNotifications` Server Action — authenticates, deletes all by `user_id` via service-role client
- [x] NotificationBell only renders when user is authenticated
- [x] Bell shows unread count badge (capped at 99+)
- [x] First click on bell triggers lazy fetch of last 10 notifications
- [x] Dropdown opens with proper positioning + shadow + z-index
- [x] Unread items show `bg-muted/50` + `border-l-primary` + `font-medium`
- [x] Read items show transparent bg + `border-l-transparent` + `text-muted-foreground`
- [x] Each notification type shows the correct lucide-react icon
- [x] `X` button on each notification item — appears on hover (`group-hover:opacity-100`), stops propagation
- [x] Per-item delete removes from local state optimistically, decrements unread count if applicable
- [x] "Clear all" button in header when any notifications exist
- [x] "No notifications yet" empty state when list is empty (including after clearing all)
- [x] "Mark all as read" button appears when there are unread items
- [x] Clicking a notification marks it read (`startTransition`) and navigates
- [x] Clicking outside or pressing Escape closes the dropdown
- [x] Dropdown closes after clicking a notification, "Mark all as read", or "Clear all"
- [x] No new CSS tokens — only existing design system variables
- [x] Mobile sheet left unchanged (v1 desktop-only)
- [x] `npm run build` passes with zero errors

## Files Added / Modified

### `app/actions.ts` — Two new Server Actions

Two new exports added to the existing citizen actions file:

**`markNotificationAsRead(notificationId: string)`**

Creates a server client, authenticates via `getUser()`, then updates `is_read = true` on the notification matching both `id` and `user_id` (defense-in-depth — even though RLS enforces ownership). Returns `{ success: true }` or `{ success: false, error }`.

**`markAllNotificationsAsRead()`**

Same pattern but updates all rows where `user_id = auth.uid()` AND `is_read = false`. Single query, no loop. Returns the same response shape.

Both follow the existing pattern: `try/catch` wrapper, Zod validation is omitted (UUIDs are validated by Postgres, and the `is_read` boolean is hard-coded — no client-supplied value).

**`deleteNotification(notificationId: string)`**

Uses the service-role client (bypasses RLS) because there is no DELETE policy on the `notifications` table — only SELECT and UPDATE are covered. Ownership is enforced server-side by filtering `eq("user_id", user.id)`. Returns `{ success: true }` or `{ success: false, error }`.

**`clearAllNotifications()`**

Same pattern — deletes all notifications for the authenticated user using the service-role client. No loop, single `delete().eq("user_id", user.id)` query. Returns the same response shape.

### `components/notification-bell.tsx` — Client component

**Props:**

```typescript
interface NotificationBellProps {
  userId: string;
}
```

**Internal state machine:**

```
const [notifications, setNotifications] = useState<Tables<"notifications">[] | null>(null);
const [unreadCount, setUnreadCount] = useState<number>(0);
const [open, setOpen] = useState(false);
const [fetching, setFetching] = useState(false);
const [markingAll, setMarkingAll] = useState(false);
```

**Key behaviors:**

- **Unread count** is fetched eagerly on mount via `supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false)`. This is a lightweight index-only query (uses `idx_notifications_user_id_is_read`).
- **Notification list** is fetched lazily on first `open = true`. Uses `supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10)`.
- **Click-to-read:** Wraps the Server Action in `startTransition`. On success: updates local state to mark the item as read, decrements badge count, navigates to `/my-reports/${reportId}`.
- **Mark all as read:** Sets `markingAll = true`, calls Server Action, on success resets all local notification `is_read` to `true`, sets count to 0.
- **Close handlers:** `useEffect` with `mousedown` and `keydown(Escape)` listeners, active only when `open === true`.

**Accessibility:**
- Bell button has `aria-label="Notifications"` and `aria-expanded` reflecting open state
- Dropdown uses `role="menu"`
- Items use `role="menuitem"` with `tabIndex={0}`

### `components/public-nav.tsx` — NotificationBell integration

One import added at the top:

```typescript
import { NotificationBell } from "@/components/notification-bell";
```

One line added in the desktop nav section, inside the `user ? (...)` block, before the avatar dropdown:

```tsx
<NotificationBell userId={user.id} />
```

The import path and component placement ensure the bell only renders when the user is authenticated. Mobile sheet is unchanged.

### Unchanged files

- `lib/notifications.ts` — no changes (still uses admin client for creation)
- `lib/admin-notifications.tsx` — no changes
- `emails/render.ts` — no changes
- `app/admin/actions.ts` — no changes
- `types/database.types.ts` — no changes
- `lib/date-utils.ts` — reused, not modified
