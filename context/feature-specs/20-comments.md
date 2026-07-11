# Comments on Reports

## Design

- **Genre:** Community — allows authenticated users to discuss approved/resolved reports. Single-level threading (reply to top-level only, no nested replies). Editing and deletion by the comment author at any time. Admin moderation via soft-delete. In-app notification to the report owner.
- **Scope:** Comments on the public report detail page only. No comment section on admin detail pages, citizen my-reports detail, or feedback pages. No nested replies beyond one level.
- **Architecture:** `report_comments` table with a denormalized `author_name` column (avoids FK join through `auth.users` to `profiles` which PostgREST cannot resolve). RLS policies gate read/write. Server actions handle CRUD + admin soft-delete. Optimistic updates for insert/delete/remove provide instant UI feedback. A `cancelled` flag pattern prevents stale fetch race conditions.

### Entry Points

| Entry | Route | Purpose |
|-------|-------|---------|
| Comment section | `/reports/[id]` | Full comment section below the location map |

## Database Changes

### New Types

```sql
CREATE TYPE comment_status AS ENUM ('ACTIVE', 'REMOVED');
```

Add `COMMENT_ADDED` to existing `notification_type` enum (non-transaction migration).

### New Table: `report_comments`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `report_id` | `uuid` | FK → `reports(id)` ON DELETE CASCADE, NOT NULL |
| `user_id` | `uuid` | FK → `auth.users(id)` ON DELETE CASCADE, NOT NULL |
| `parent_id` | `uuid` | FK → `report_comments(id)` ON DELETE CASCADE, nullable |
| `author_name` | `text` | NOT NULL DEFAULT '' (denormalized from profiles at creation) |
| `body` | `text` | NOT NULL (1-2000 chars) |
| `status` | `comment_status` | NOT NULL DEFAULT 'ACTIVE' |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() |

### Indexes

- `report_comments_report_id_idx` ON `report_comments(report_id)`
- `report_comments_user_id_idx` ON `report_comments(user_id)`
- `report_comments_parent_id_idx` ON `report_comments(parent_id)`

### RLS

- **SELECT:** `status = 'ACTIVE'` AND the parent report is `APPROVED` or `RESOLVED` (uses `EXISTS` subquery on `reports`)
- **INSERT:** Authenticated user, `user_id` must match `auth.uid()`, report must exist and be `APPROVED`/`RESOLVED`
- **UPDATE:** Authenticated user, `user_id` must match `auth.uid()`, comment must be `ACTIVE`
- **DELETE:** Authenticated user, `user_id` must match `auth.uid()`

### Migration Notes

- `author_name` column added in a separate migration after the table is created. Backfilled via `UPDATE report_comments rc SET author_name = p.full_name FROM profiles p WHERE rc.user_id = p.id`.
- A `reports` RLS fix was required: the existing `"Public can read approved and resolved reports"` policy was `TO anon` only, which blocked the `EXISTS` subquery for authenticated non-owners. Fixed by dropping `TO anon` so the policy applies to all roles.

## Server Actions

### `addComment(report_id, parent_id, body)` — `app/actions.ts`

| Step | Detail |
|------|--------|
| Auth | `requireUser()` — returns 401 if not authenticated |
| Profile fetch | Gets `profiles.full_name` for `author_name` |
| Validation | `body.trim()`, length 1-2000 |
| Insert | `supabase.from("report_comments").insert({...}).select("*").single()` — returns full row |
| Notification | If commenter != report owner: create `COMMENT_ADDED` notification via service role client |
| Return | `{ success: true, data: comment }` (full row for optimistic insert) |

### `editComment(comment_id, body)` — `app/actions.ts`

| Step | Detail |
|------|--------|
| Auth | `requireUser()` |
| Validation | `body.trim()`, length 1-2000 |
| Update | `supabase.from("report_comments").update({body, updated_at}).eq('id', comment_id).eq('user_id', user_id)` |
| Return | `{ success: true }` |

### `deleteComment(comment_id)` — `app/actions.ts`

| Step | Detail |
|------|--------|
| Auth | `requireUser()` |
| Delete | `supabase.from("report_comments").delete().eq('id', comment_id).eq('user_id', user_id)` |
| Return | `{ success: true }` |

### `removeComment(comment_id)` — `app/admin/actions.ts`

| Step | Detail |
|------|--------|
| Auth | `verifyAdmin()` |
| Soft-delete | `supabase.from("report_comments").update({status: 'REMOVED'}).eq('id', comment_id)` via service role client |
| Return | `{ success: true }` |

## Comment Form — `components/reports/comment-form.tsx`

### States

- **Default (Post mode):** Shows avatar + auto-resize textarea + Post button. Textarea placeholder: "Share your thoughts…". Post button is disabled when body is empty or exceeds 2000 chars. Character count shown at bottom-right when typing.
- **Edit mode:** Textarea pre-filled with existing body. Button shows "Save" instead of "Post". Cancel button appears to discard edit.
- **Loading:** Post/Save button shows a spinner; textarea and buttons are disabled.
- **Validation error:** Not applicable — inline character count prevents over-length; Post is disabled when empty.
- **Network error:** `toast.error` on failure; form remains filled so user can retry.

### Edge Cases

- **Empty body:** Post button disabled.
- **Body > 2000 chars:** Post button disabled; character count turns red.
- **User types very long text:** Textarea scrolls internally (no manual height limit beyond auto-resize).
- **Edit cancelled:** Textarea reverts to original body; mode switches back to Post.

## Comment List — `components/reports/comment-list.tsx`

### States

- **Loading:** Skeleton placeholders (3 rows of grey blocks).
- **Empty:** "No comments yet. Be the first to share your thoughts." with a subtle icon.
- **Error:** "Failed to load comments" with a Retry button.
- **Populated:** List of `CommentItem` components, sorted oldest-first. Top-level comments alternate with their reply indented below.
- **Optimistic merge:** Merges `optimisticComments` from parent with fetched data, deduplicating by `id`. Calls `onOptimisticConfirmed(ids)` after successful fetch to clear confirmed IDs.

### Race Condition Handling

Uses a `cancelled` flag pattern inside `useEffect`:

```
useEffect(() => {
  let cancelled = false;
  fetchComments().then(data => {
    if (!cancelled) setComments(data);
  });
  return () => { cancelled = true; };
}, [refreshKey]);
```

Prevents stale responses from overwriting newer data when `refreshKey` changes while a fetch is in-flight.

## Comment Item — `components/reports/comment-item.tsx`

### States

- **Normal:** Avatar (initials fallback), author name (`author_name`), relative timestamp, edited indicator `"(edited)"`, body text. Three-dot menu for actions.
- **Own comment (author):** Three-dot menu shows Edit and Delete. Clicking Edit enters inline edit mode (reuses `CommentForm` with `mode="edit"`). Clicking Delete calls `deleteComment` → sets `locallyDeleted = true` → component hides instantly.
- **Admin view:** Three-dot menu shows Remove (red). Clicking Remove calls `removeComment` → sets `locallyRemoved = true` → body replaced with `"Removed by moderator"` placeholder instantly.
- **Removed:** If `status === 'REMOVED'` from server data, shows `"[removed]"` in grey italic with no actions.
- **Deleted (local):** `locallyDeleted === true` → returns `null`, component hidden entirely.
- **Removed by admin (local):** `locallyRemoved === true` → shows `"Removed by moderator"` grey italic placeholder.
- **Error on delete/remove:** `toast.error`.

### Edge Cases

- **Comment with no author_name:** Shows "Anonymous" as fallback.
- **Admin removes already-removed comment:** Button disabled — state is already `REMOVED`.
- **Author deletes while admin removes:** Race prevented by optimistic flag — whichever response arrives first sets the local state; the other becomes a no-op on the server side (already deleted).

## Comment Section — `components/reports/comment-section.tsx`

### States

- **Logged in:** Shows heading with speech bubble icon, comment count, `<CommentForm>`, `<CommentList>`.
- **Not logged in:** Shows heading + "Sign in to comment" link to `/login`.
- **Loading:** Not applicable — login state is known from parent.

### Edge Cases

- **Report has 0 comments:** Comment list shows empty state; heading says "Comments (0)".
- **Report has many comments:** List scrolls naturally on the page.
- **User signs in while on page:** Reload needed — not handled dynamically.

## Notification Integration

| Aspect | Detail |
|--------|--------|
| Type | `COMMENT_ADDED` added to `notification_type` enum |
| Message | `"{{author_name}} commented on your report"` |
| Subject | `"New comment on your report"` |
| Icon | `MessageCircle` (in `NOTIFICATION_ICONS` map) |
| Href | `/reports/{{report_id}}` (via `getNotificationHref`) |
| Trigger | Inside `addComment` server action, only if commenter != report owner |

## Data Flow

```
User posts a comment:
  → CommentForm validates body (1-2000 chars)
  → Calls addComment(report_id, parent_id, body) server action
    → Server inserts row with author_name from profiles
    → Returns full comment row via .select("*")
  → CommentSection adds returned row to optimisticComments state (instant display)
  → CommentList re-fetches on next refreshKey
    → Merges fetched data with optimisticComments (dedup by id)
    → Calls onOptimisticConfirmed to clear confirmed IDs
  → If commenter != report owner:
    → COMMENT_ADDED notification created via service role client
    → Report owner sees notification in bell dropdown

User edits their comment:
  → Clicks Edit → CommentForm enters edit mode
  → Edits body, clicks Save
  → Calls editComment(comment_id, body) server action
  → CommentList re-fetches; updated body appears (no optimistic update for edit)

User deletes their comment:
  → Clicks Delete → confirmation
  → Calls deleteComment(comment_id) server action
  → On success: CommentItem sets locallyDeleted=true → component hides instantly

Admin removes a comment:
  → Clicks Remove → confirmation
  → Calls removeComment(comment_id) admin server action
  → On success: CommentItem sets locallyRemoved=true → shows "Removed by moderator"
```

## Files Created

| File | Purpose |
|------|---------|
| `components/reports/comment-section.tsx` | Orchestrates CommentForm + CommentList with optimistic state |
| `components/reports/comment-form.tsx` | Post/edit form with auto-resize textarea, char count, validation |
| `components/reports/comment-list.tsx` | Fetch + render comments with optimistic merge, cancelled flag |
| `components/reports/comment-item.tsx` | Individual comment display with edit/delete/remove, optimistic flags |
| `supabase/migrations/20250711000001_add_comments.sql` | Adds `COMMENT_ADDED` to `notification_type` enum |
| `supabase/migrations/20250711000002_add_comments_table.sql` | Creates `comment_status` enum, `report_comments` table, RLS, indexes |
| `supabase/migrations/20250711000003_add_comment_author_name.sql` | Adds `author_name` column + backfill |
| `supabase/migrations/20250711000004_fix_reports_rls_auth.sql` | Fixes reports RLS to cover all roles |

## Files Modified

| File | Change |
|------|--------|
| `types/database.types.ts` | Added `comment_status` enum, `report_comments` table types, `COMMENT_ADDED` to `notification_type` |
| `app/actions.ts` | Added `addComment` (returns full row via `.select("*")`), `editComment`, `deleteComment` |
| `app/admin/actions.ts` | Added `removeComment` (service role, soft-delete to `REMOVED`) |
| `lib/notifications.ts` | Added `COMMENT_ADDED` type, message, and subject handlers |
| `components/notification-bell.tsx` | Added `COMMENT_ADDED` icon (`MessageCircle`) and href routing |
| `app/(public)/reports/[id]/page.tsx` | Added user role fetch + `<CommentSection>` below location map |

## Implementation Status

| Item | Status |
|------|--------|
| Migration — `COMMENT_ADDED` enum | ✅ Done |
| Migration — `report_comments` table, `comment_status` enum, RLS, indexes | ✅ Done |
| Migration — `author_name` column + backfill | ✅ Done |
| Migration — reports RLS fix (TO anon → all roles) | ✅ Done |
| Types — `database.types.ts` updated | ✅ Done |
| Server action — `addComment` (returns full row) | ✅ Done |
| Server action — `editComment` | ✅ Done |
| Server action — `deleteComment` | ✅ Done |
| Server action — `removeComment` (admin soft-delete) | ✅ Done |
| Component — `comment-section.tsx` with optimistic state | ✅ Done |
| Component — `comment-form.tsx` with post/edit modes | ✅ Done |
| Component — `comment-list.tsx` with `.select("*")`, cancelled flag, optimistic merge | ✅ Done |
| Component — `comment-item.tsx` with edit/delete/remove, locallyDeleted/locallyRemoved | ✅ Done |
| Notification — `COMMENT_ADDED` type, message, icon, href | ✅ Done |
| Page — `/reports/[id]` renders CommentSection | ✅ Done |
| Context files — all 6 updated | ✅ Done |
| `npm run build` passes with zero errors | ✅ Done |

## Check When Done

- [x] Logged-in users can post a comment on approved/resolved report detail pages
- [x] Comment body is validated (1-2000 chars, trimmed)
- [x] Comment author name comes from `profiles.full_name` (denormalized `author_name` column)
- [x] Comments appear instantly after posting (optimistic insert via `.select("*")` return)
- [x] Comment authors can edit their own comments (inline edit, "edited" indicator appears)
- [x] Comment authors can delete their own comments (instant hide via `locallyDeleted`)
- [x] Admin users see "Remove" option on all comments (soft-delete, `locallyRemoved` placeholder)
- [x] Removed comments show "[removed]" for normal users, "Removed by moderator" for admins
- [x] Report owner receives in-app notification when someone comments (not on own comment)
- [x] Not-logged-in users see "Sign in to comment" prompt
- [x] Comment list is sorted oldest-first, single-level threading
- [x] Race condition handled (cancelled flag prevents stale fetch overwrite)
- [x] RLS works for all roles (reports policy covers anon + authenticated)
- [x] Service worker cache invalidation noted for dev workflow
- [x] `npm run build` passes with zero errors
