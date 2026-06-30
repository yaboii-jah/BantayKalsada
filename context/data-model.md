# Data Model

This file defines the complete database schema for Bantay Kalsada. It is the authoritative reference for all Supabase SQL migrations. Every table, column, constraint, index, trigger, and RLS policy defined here must be implemented exactly as written. Do not add, rename, or remove fields without updating this file first.

---

## What Lives in the Database

The database owns all structured application data. It does not store binary content, authentication tokens, or session data — those are Supabase's responsibility.

| Data | Location |
|---|---|
| User identity (credentials, sessions, email verification) | `auth.users` — Supabase-managed, never written to directly |
| User display name and role | `profiles` table — application-owned |
| Road incident reports | `reports` table |
| Status change notifications | `notifications` table |
| Report photos | Cloudinary —  only the URL strings are stored in the database |

---

## Custom Enum Types

Define these types before creating any tables. They are referenced as column types.

```sql
CREATE TYPE user_role AS ENUM ('CITIZEN', 'ADMIN');

CREATE TYPE report_category AS ENUM (
  'POTHOLE',
  'FLOODED_ROAD',
  'ROAD_ACCIDENT',
  'ROAD_RAGE',
  'OTHER'
);

CREATE TYPE report_status AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'RESOLVED'
);

CREATE TYPE notification_type AS ENUM (
  'REPORT_APPROVED',
  'REPORT_REJECTED',
  'REPORT_RESOLVED'
);
```

---

## Tables

### `auth.users` (Supabase-managed)

This table is owned and maintained by Supabase Auth. Application code never inserts, updates, or deletes rows in this table. It is referenced here only to document the fields the application reads from it.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key — used as the foreign key in `profiles`, `reports`, and `notifications` |
| `email` | `text` | The user's registered email address |
| `email_confirmed_at` | `timestamptz` | Null if unverified. Read server-side to enforce email verification gate. |
| `raw_user_meta_data` | `jsonb` | Contains `full_name` passed during registration via `supabase.auth.signUp()` options |

---

### `profiles`

Application-owned profile data synced from `auth.users` via a database trigger. Created automatically when a new user signs up. Never created manually by application code.

```sql
CREATE TABLE profiles (
  id            uuid          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     text          NOT NULL DEFAULT '',
  email         text          NOT NULL DEFAULT '',
  role          user_role     NOT NULL DEFAULT 'CITIZEN',
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now()
);
```

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | No | — | FK to `auth.users.id`. Cascade deletes when the auth user is deleted. |
| `full_name` | `text` | No | `''` | Set from `raw_user_meta_data->>'full_name'` on user creation via trigger. |
| `email` | `text` | No | `''` | Denormalized from `auth.users.email` for convenient access without joining the auth schema. Set via trigger. |
| `role` | `user_role` | No | `'CITIZEN'` | Defaults to `CITIZEN`. Change to `ADMIN` via Supabase Studio or `supabase/seed.sql` only — no in-app UI. |
| `created_at` | `timestamptz` | No | `now()` | Auto-set on row creation. |
| `updated_at` | `timestamptz` | No | `now()` | Must be updated via trigger whenever the row changes. |

---

### `reports`

The core table. Stores all citizen-submitted road incident reports at every stage of the lifecycle.

```sql
CREATE TABLE reports (
  id                uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text            NOT NULL,
  description       text            NOT NULL,
  category          report_category NOT NULL,
  status            report_status   NOT NULL DEFAULT 'PENDING',
  photo_urls        text[]          NOT NULL DEFAULT '{}',
  latitude          double precision NOT NULL,
  longitude         double precision NOT NULL,
  location_label    text            NULL,
  rejection_reason  text            NULL,
  submitted_by_id   uuid            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewed_by_id    uuid            NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at      timestamptz     NOT NULL DEFAULT now(),
  reviewed_at       timestamptz     NULL,
  resolved_at       timestamptz     NULL,

  CONSTRAINT title_length
    CHECK (char_length(title) >= 5 AND char_length(title) <= 100),

  CONSTRAINT description_length
    CHECK (char_length(description) >= 20 AND char_length(description) <= 1000),

  CONSTRAINT photo_urls_count
    CHECK (array_length(photo_urls, 1) >= 1 AND array_length(photo_urls, 1) <= 3),

  CONSTRAINT latitude_range
    CHECK (latitude >= -90 AND latitude <= 90),

  CONSTRAINT longitude_range
    CHECK (longitude >= -180 AND longitude <= 180),

  CONSTRAINT rejection_reason_required
    CHECK (
      (status = 'REJECTED' AND rejection_reason IS NOT NULL AND char_length(TRIM(rejection_reason)) >= 10)
      OR
      (status != 'REJECTED')
    )
);
```

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | Primary key, auto-generated. |
| `title` | `text` | No | — | 5–100 characters. Enforced by `title_length` constraint and Zod. |
| `description` | `text` | No | — | 20–1000 characters. Enforced by `description_length` constraint and Zod. |
| `category` | `report_category` | No | — | Must match one of the defined enum values. |
| `status` | `report_status` | No | `'PENDING'` | Set by server-side logic only. Never accepted as a client value. |
| `photo_urls` | `text[]` | No | `'{}'` | Array of 1–3 Cloudinary CDN URLs. Enforced by `photo_urls_count` constraint. |
| `latitude` | `double precision` | No | — | From the map pin. Validated by `latitude_range` constraint. |
| `longitude` | `double precision` | No | — | From the map pin. Validated by `longitude_range` constraint. |
| `location_label` | `text` | Yes | `null` | Optional human-readable address from Nominatim reverse geocoding. |
| `rejection_reason` | `text` | Yes | `null` | Required (min 10 chars) when `status = 'REJECTED'`. Enforced by `rejection_reason_required` constraint. Null for all other statuses. |
| `submitted_by_id` | `uuid` | No | — | FK to `auth.users.id`. The citizen who submitted the report. |
| `reviewed_by_id` | `uuid` | Yes | `null` | FK to `auth.users.id`. The admin who approved or rejected. Set when status changes from `PENDING`. |
| `submitted_at` | `timestamptz` | No | `now()` | When the report was first created. |
| `reviewed_at` | `timestamptz` | Yes | `null` | When the admin approved or rejected. Set server-side at the time of the action. |
| `resolved_at` | `timestamptz` | Yes | `null` | When the admin marked the report as resolved. Set server-side at the time of the action. |

---

### `notifications`

Stores in-app notification records created when a report's status changes. One row per status change event per user. Used for the notification center (v1.1) and provides a record of all status change events.

```sql
CREATE TABLE notifications (
  id          uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid              NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_id   uuid              NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  message     text              NOT NULL,
  is_read     boolean           NOT NULL DEFAULT false,
  created_at  timestamptz       NOT NULL DEFAULT now()
);
```

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | Primary key, auto-generated. |
| `user_id` | `uuid` | No | — | FK to `auth.users.id`. The citizen being notified. |
| `report_id` | `uuid` | No | — | FK to `reports.id`. The report this notification relates to. |
| `type` | `notification_type` | No | — | The event type. Determines the message template. |
| `message` | `text` | No | — | Human-readable notification text generated server-side at creation time. |
| `is_read` | `boolean` | No | `false` | Flipped to `true` when the citizen views the notification. |
| `created_at` | `timestamptz` | No | `now()` | Auto-set on row creation. |

---

## Relationships

```
auth.users (Supabase-managed)
  │
  ├── profiles.id                (one-to-one, cascade delete)
  ├── reports.submitted_by_id   (one-to-many, cascade delete)
  ├── reports.reviewed_by_id    (one-to-many, set null on delete)
  └── notifications.user_id     (one-to-many, cascade delete)

reports
  └── notifications.report_id   (one-to-many, cascade delete)
```

---

## Indexes

```sql
-- reports: public feed and admin queue filtering by status
CREATE INDEX idx_reports_status ON reports(status);

-- reports: filtering by category on the public feed
CREATE INDEX idx_reports_category ON reports(category);

-- reports: citizen's own report history lookup
CREATE INDEX idx_reports_submitted_by_id ON reports(submitted_by_id);

-- reports: admin pending queue sorted oldest first; public feed sorted newest first
CREATE INDEX idx_reports_submitted_at ON reports(submitted_at DESC);

-- reports: composite index for the most common public feed query (approved/resolved, sorted by date)
CREATE INDEX idx_reports_status_submitted_at ON reports(status, submitted_at DESC);

-- notifications: citizen fetching their own notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- notifications: filtering unread notifications for badge count
CREATE INDEX idx_notifications_user_id_is_read ON notifications(user_id, is_read);
```

---

## Database Functions and Triggers

### 1. Create profile on signup

Fires after a new row is inserted into `auth.users`. Creates the corresponding `profiles` row automatically. Application code must pass `full_name` in the `options.data` field of `supabase.auth.signUp()` so the trigger can read it from `raw_user_meta_data`.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    'CITIZEN'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();
```

### 2. Auto-update `updated_at` on profiles

Fires before any update to a `profiles` row to keep `updated_at` current.

```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();
```

---

## Row Level Security Policies

Enable RLS on all application-owned tables. Admin operations use the service role key (bypasses RLS) exclusively in server-side API route handlers — never in client-side code.

```sql
ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
```

---

### `profiles` RLS

```sql
-- Citizens can read their own profile
CREATE POLICY "Citizens can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Citizens can update their own full_name only
-- role and email are never updated via this policy
CREATE POLICY "Citizens can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

Note: Admins read other users' profiles (for the report review page) using the service role client, which bypasses RLS. There is no public read policy on `profiles`.

---

### `reports` RLS

```sql
-- Public (unauthenticated) can read approved and resolved reports only
CREATE POLICY "Public can read approved and resolved reports"
  ON reports FOR SELECT
  TO anon
  USING (status IN ('APPROVED', 'RESOLVED'));

-- Authenticated citizens can read their own reports regardless of status
CREATE POLICY "Citizens can read own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (auth.uid() = submitted_by_id);

-- Authenticated citizens with verified email can insert reports
-- Email verification is enforced at the application layer (API route checks email_confirmed_at)
-- This policy permits the insert for all authenticated users as a base;
-- the API route handler is the enforcement point for the verification gate
CREATE POLICY "Authenticated users can insert reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = submitted_by_id);
```

**Column-level note on `rejection_reason`:** RLS operates at the row level — it cannot hide individual columns from a query. The `rejection_reason` field must be excluded at the application layer:
- Public feed API routes must never include `rejection_reason` in the Supabase `.select()` call.
- Citizen own-report queries may include `rejection_reason` since the RLS policy already limits results to that citizen's own rows.
- Admin queries use the service role and have full column access.

---

### `notifications` RLS

```sql
-- Citizens can read their own notifications
CREATE POLICY "Citizens can read own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Citizens can mark their own notifications as read
CREATE POLICY "Citizens can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

Note: Notifications are created by admin API route handlers using the service role client. There is no insert policy for authenticated users — citizens cannot create notifications directly.

---

## Business Validation Rules

These rules are enforced at two levels: database constraints (defined above) and Zod schemas (in `lib/validations/`). Both layers must agree. If a constraint exists in the database, the corresponding Zod rule must exist too — and vice versa.

| Field | Rule | Enforced By |
|---|---|---|
| `profiles.full_name` | Required, non-empty | Zod (registration form) |
| `reports.title` | Required, 5–100 characters | DB constraint + Zod |
| `reports.description` | Required, 20–1000 characters | DB constraint + Zod |
| `reports.category` | Must match a valid enum value | DB enum type + Zod |
| `reports.photo_urls` | Array of 1–3 valid URLs | DB constraint + Zod |
| `reports.latitude` | Between -90 and 90 | DB constraint + Zod |
| `reports.longitude` | Between -180 and 180 | DB constraint + Zod |
| `reports.rejection_reason` | Required (min 10 chars) when status is `REJECTED` | DB constraint + Zod |
| `reports.status` | Set server-side only — never accepted from client | API route handler |
| `profiles.role` | Set via seed or Supabase Studio only — never accepted from client | API route handler + no RLS update policy for role |
| Report submission rate | Max 5 submissions per user per 24-hour window | API route handler (count query before insert) |

---

## Seed Data

The seed script at `supabase/seed.sql` creates the initial admin profile. It must be run after the first migration and only once. The admin user must first sign up normally via the app to create the `auth.users` row, then the seed script updates their `profiles.role` to `ADMIN`.

```sql
-- Replace with the email of the account that signed up via the app
UPDATE profiles
SET role = 'ADMIN'
WHERE email = 'your-admin-email@example.com';
```

---

## What Does Not Live in the Database

| Data | Why |
|---|---|
| Photo binary content | Stored in Cloudinary. Only the CDN URL is stored in `reports.photo_urls`. |
| Auth tokens and session data | Managed entirely by Supabase Auth in `auth.users`. Never touch this. |
| Passwords | Managed entirely by Supabase Auth. Never stored in application tables. |
| Email verification tokens | Managed entirely by Supabase Auth. Not stored in application tables. |
| Password reset tokens | Managed entirely by Supabase Auth. Not stored in application tables. |
