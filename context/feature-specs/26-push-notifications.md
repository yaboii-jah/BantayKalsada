# Push Notifications

## Problem

Email and SMS notifications require the citizen to check their phone/email. Push notifications
deliver alerts directly to the browser (even when the tab is closed, as long as the browser is
running), reducing response latency for time-sensitive status updates.

## Solution

Web Push API + service worker, with a Supabase Realtime channel to keep the in-app unread
notification badge live without polling.

## Architecture

```
Browser SW push listener
    ↑  push event (payload: title, body, url)
    │
web-push (server) ←── VAPID keys (.env.local)
    ↑
sendPushNotification(subscription, payload)
    ↑
Admin Server Action / notification helper
    ↓
push_subscriptions table (id, user_id, subscription JSON, created_at)
    ↓
PushSubscriptionManager (client component, mounts in citizen layout)
    ↓
navigator.serviceWorker.ready → pushManager.subscribe()
```

### Realtime live badge

```
Browser ←── Supabase Realtime channel ──→ notifications table
         postgres_changes (INSERT / UPDATE / DELETE)
              ↓
         notification-bell.tsx re-fetches COUNT(*)
```

## Database

### `push_subscriptions` table

| Column       | Type      | Notes                        |
|-------------|-----------|------------------------------|
| id          | uuid      | PK, default gen_random_uuid() |
| user_id     | uuid      | FK → auth.users, NOT NULL     |
| subscription | jsonb    | PushSubscription JSON         |
| created_at  | timestamptz | default now()               |

RLS: authenticated users can read/write only their own rows.

## Files

| File | Role |
|------|------|
| `supabase/migrations/20250727000001_add_push_subscriptions.sql` | Create table + RLS |
| `lib/push.ts` | `sendPushNotification()` with VAPID config, expired sub cleanup |
| `app/sw.ts` | `push` and `notificationclick` event listeners |
| `components/push-subscription-manager.tsx` | `PushSubscriptionManager`, `requestPushSubscription()`, `unsubscribeFromPush()` |
| `app/actions.ts` | `savePushSubscription` Server Action |
| `lib/admin-notifications.tsx` | Push wired after SMS in `sendReportNotifications` |
| `lib/admin-feedback-notifications.tsx` | Push wired after email in `sendFeedbackNotifications` |
| `components/notification-bell.tsx` | Supabase Realtime channel for live unread count |
| `app/(citizen)/account/page.tsx` | Fetches push subscription status |
| `app/(citizen)/account/account-form.tsx` | Push enable/disable toggle |
| `app/(citizen)/layout.tsx` | Mounts PushSubscriptionManager |

## States

### Push toggle on Account Settings

1. **Loading** — spinner while checking subscription status
2. **Unsupported** — browser lacks serviceWorker / PushManager — message shown
3. **Permission denied** — blocked state, link to browser settings
4. **Off, permission default** — "Enable Push Notifications" button, prompts on click
5. **On, subscribed** — "Disable Push Notifications" button, unsubscribes on click
6. **Subscribing** — button spinner during `requestPushSubscription()`
7. **Unsubscribing** — button spinner during `unsubscribeFromPush()`
8. **Error** — toast on subscribe/unsubscribe failure

### Notification bell live badge

1. **Loading** — initial COUNT fetch (sets unread count)
2. **Realtime open** — Supabase channel connected, receiving events
3. **Insert event** — increment unread count (new notification arrived)
4. **Update event** — decrement unread count (notification marked read elsewhere)
5. **Delete event** — decrement unread count (notification deleted elsewhere)
6. **Channel error** — count falls back to on-click fetch, no visible error

## Edge Cases

- **Service worker update**: If the SW updates, `pushManager.subscribe()` returns the same
  subscription — no duplicate rows. `savePushSubscription` upserts by user_id.
- **Expired subscription**: `web-push` throws with code 410/404; `sendPushNotification()`
  catches and deletes the row from `push_subscriptions`.
- **Multiple tabs**: Realtime channel fires on any insert/update — badge stays in sync
  across tabs without polling.
- **Permission revoked**: Next push send will get a 410, subscription auto-cleaned.
- **VAPID missing**: `sendPushNotification()` returns early, logged as a warning.
