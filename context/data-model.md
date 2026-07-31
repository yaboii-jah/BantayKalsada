# Data Model

This file defines the complete database schema for Bantay Kalsada. It is the authoritative reference for all Supabase SQL migrations. Every table, column, constraint, index, trigger, and RLS policy defined here must be implemented exactly as written. Do not add, rename, or remove fields without updating this file first.

---

## What Lives in the Database

The database owns all structured application data. It does not store binary content, authentication tokens, or session data — those are Supabase's responsibility.

| Data | Location |
|---|---|---|
| User identity (credentials, sessions, email verification) | `auth.users` — Supabase-managed, never written to directly |
| User display name and role | `profiles` table — application-owned |
| Road incident reports | `reports` table |
| Status change notifications | `notifications` table |
| App feedback submissions | `feedback` table |
| Comments on reports | `report_comments` table |
| Citizen flags on reports | `report_flags` table |
| Upload sign request log | `upload_sign_log` table |
| Municipality boundary polygons (Taytay, Rizal) | `municipality_boundaries` table |
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

CREATE TYPE report_severity AS ENUM (
  'MINOR',
  'URGENT',
  'EMERGENCY'
);

CREATE TYPE comment_status AS ENUM ('ACTIVE', 'REMOVED');

CREATE TYPE notification_type AS ENUM (
  'COMMENT_ADDED',
  'REPORT_APPROVED',
  'REPORT_REJECTED',
  'REPORT_RESOLVED',
  'REPORT_FLAGGED',
  'FEEDBACK_ACKNOWLEDGED',
  'FEEDBACK_CLOSED'
);

CREATE TYPE report_flag_type AS ENUM (
  'ALREADY_FIXED',
  'WRONG_LOCATION'
);

CREATE TYPE barangay AS ENUM (
  'DOLORES',
  'SAN_ISIDRO',
  'SAN_JUAN',
  'SANTA_ANA',
  'MUZON'
);

CREATE TYPE feedback_type AS ENUM ('BUG_REPORT', 'FEATURE_REQUEST', 'GENERAL');

CREATE TYPE feedback_status AS ENUM ('OPEN', 'ACKNOWLEDGED', 'CLOSED');

CREATE TYPE comment_status AS ENUM ('ACTIVE', 'REMOVED');
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
  phone         text          NULL,
  sms_notifications boolean  NOT NULL DEFAULT false,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now()
);
```

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|---|
| `id` | `uuid` | No | — | FK to `auth.users.id`. Cascade deletes when the auth user is deleted. |
| `full_name` | `text` | No | `''` | Set from `raw_user_meta_data->>'full_name'` on user creation via trigger. |
| `email` | `text` | No | `''` | Denormalized from `auth.users.email` for convenient access without joining the auth schema. Set via trigger. |
| `role` | `user_role` | No | `'CITIZEN'` | Defaults to `CITIZEN`. Change to `ADMIN` via Supabase Studio or `supabase/seed.sql` only — no in-app UI. |
| `phone` | `text` | Yes | `null` | Philippine mobile number in +63 format. Set by citizen via account settings. Used for SMS notifications. |
| `sms_notifications` | `boolean` | No | `false` | Opt-in toggle for SMS alerts on report status changes. Set by citizen via account settings. |
| `created_at` | `timestamptz` | No | `now()` | Auto-set on row creation. |
| `updated_at` | `timestamptz` | No | `now()` | Must be updated via trigger whenever the row changes. |

---

### `reports`

The core table. Stores all citizen-submitted road incident reports at every stage of the lifecycle.

```sql
CREATE TABLE reports (
  id                uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text             NOT NULL,
  description       text             NOT NULL,
  category          report_category  NOT NULL,
  severity          report_severity  NOT NULL DEFAULT 'MINOR',
  status            report_status    NOT NULL DEFAULT 'PENDING',
  photo_urls        text[]          NOT NULL DEFAULT '{}',
  latitude          double precision NOT NULL,
  longitude         double precision NOT NULL,
  location_label    text            NULL,
  barangay          barangay        NULL,
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
    ),

  CONSTRAINT report_within_taytay_check
    CHECK (location IS NOT NULL)
);
```

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | Primary key, auto-generated. |
| `title` | `text` | No | — | 5–100 characters. Enforced by `title_length` constraint and Zod. |
| `description` | `text` | No | — | 20–1000 characters. Enforced by `description_length` constraint and Zod. |
| `category` | `report_category` | No | — | Must match one of the defined enum values. |
| `severity` | `report_severity` | No | `'MINOR'` | Set by the citizen on submission. Defaults to Minor if not specified. |
| `status` | `report_status` | No | `'PENDING'` | Set by server-side logic only. Never accepted as a client value. |
| `photo_urls` | `text[]` | No | `'{}'` | Array of 1–3 Cloudinary CDN URLs. Enforced by `photo_urls_count` constraint. |
| `latitude` | `double precision` | No | — | From the map pin. Validated by `latitude_range` constraint. |
| `longitude` | `double precision` | No | — | From the map pin. Validated by `longitude_range` constraint. |
| `location` | `geography(Point, 4326)` | No (generated) | — | PostGIS geography point. Generated column computed from `longitude, latitude` via `ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography`. Enables spatial queries with `ST_DWithin` using the GIST index. |
| `location_label` | `text` | Yes | `null` | Optional human-readable address from Nominatim reverse geocoding. |
| `barangay` | `barangay` | Yes | `null` | The Taytay barangay where the incident is located. Manually selected by the citizen from an `InlineSelect` dropdown on the submission form. Stays nullable — pre-scope rows keep `NULL` (no backfill or `NOT NULL` migration planned). |
| `rejection_reason` | `text` | Yes | `null` | Required (min 10 chars) when `status = 'REJECTED'`. Enforced by `rejection_reason_required` constraint. Null for all other statuses. |
| `submitted_by_id` | `uuid` | No | — | FK to `auth.users.id`. The citizen who submitted the report. |
| `reviewed_by_id` | `uuid` | Yes | `null` | FK to `auth.users.id`. The admin who approved or rejected. Set when status changes from `PENDING`. |
| `submitted_at` | `timestamptz` | No | `now()` | When the report was first created. |
| `reviewed_at` | `timestamptz` | Yes | `null` | When the admin approved or rejected. Set server-side at the time of the action. |
| `resolved_at` | `timestamptz` | Yes | `null` | When the admin marked the report as resolved. Set server-side at the time of the action. |

---

**Generated geography column** (added via separate migration after table creation):
```sql
ALTER TABLE reports ADD COLUMN location geography(Point, 4326)
  GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED;
```

### `report_flags`

Stores citizen flags on approved/resolved reports. A citizen can flag a report as "already fixed" or "wrong location" to alert admins about stale or mislocated reports. Flags are independent per type — a citizen can mark a report as both "already fixed" and "wrong location" at the same time, with one flag row per type.

```sql
CREATE TABLE report_flags (
  id         uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  uuid             NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id    uuid             NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flag_type  report_flag_type NOT NULL,
  created_at timestamptz      NOT NULL DEFAULT now(),

  CONSTRAINT report_flags_unique_per_type UNIQUE (report_id, user_id, flag_type)
);

CREATE INDEX idx_report_flags_report_id ON report_flags(report_id);
```

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | Primary key, auto-generated. |
| `report_id` | `uuid` | No | — | FK to `reports.id`. Cascade deletes when the report is deleted. |
| `user_id` | `uuid` | No | — | FK to `auth.users.id`. Cascade deletes when the auth user is deleted. |
| `flag_type` | `report_flag_type` | No | — | `ALREADY_FIXED` or `WRONG_LOCATION`. |
| `created_at` | `timestamptz` | No | `now()` | Auto-set on row creation. |

The `UNIQUE (report_id, user_id, flag_type)` constraint guarantees each citizen can have at most one flag row per type per report; each type is toggled independently — flagging a type inserts its row, and unflagging deletes only that type's row. Migration `20250731000002` changed the constraint from `(report_id, user_id)` so both types can be active at once.

### `report_comments`

Stores comments on approved/resolved reports. Supports single-level threading (top-level comments with flat replies). Comments can be soft-deleted by administrators.

```sql
CREATE TABLE report_comments (
  id          uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   uuid            NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id     uuid            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id   uuid            NULL REFERENCES report_comments(id) ON DELETE CASCADE,
  body        text            NOT NULL,
  author_name text            NOT NULL DEFAULT '',
  status      comment_status  NOT NULL DEFAULT 'ACTIVE',
  created_at  timestamptz     NOT NULL DEFAULT now(),
  updated_at  timestamptz     NOT NULL DEFAULT now(),

  CONSTRAINT comment_body_length CHECK (char_length(body) >= 1 AND char_length(body) <= 2000)
);
```

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | Primary key, auto-generated. |
| `report_id` | `uuid` | No | — | FK to `reports.id`. Cascade deletes when the report is deleted. |
| `user_id` | `uuid` | No | — | FK to `auth.users.id`. Cascade deletes when the auth user is deleted. |
| `parent_id` | `uuid` | Yes | `null` | FK to `report_comments.id`. Null for top-level comments, non-null for replies. |
| `body` | `text` | No | — | 1–2000 characters. Enforced by `comment_body_length` constraint and server-side validation. |
| `author_name` | `text` | No | `''` | Denormalized from `profiles.full_name` at comment creation time. Set by the `addComment` Server Action. Avoids FK join to profiles for display, works for both anon and authenticated visitors. |
| `status` | `comment_status` | No | `'ACTIVE'` | `ACTIVE` for visible, `REMOVED` for admin soft-delete. |
| `created_at` | `timestamptz` | No | `now()` | Auto-set on row creation. |
| `updated_at` | `timestamptz` | No | `now()` | Updated on edit via the Server Action. |

### `upload_sign_log`

Tracks signature requests to the `/api/uploads/sign` endpoint for rate limiting. One row per request. Prevents rapid-fire Cloudinary upload abuse.

```sql
CREATE TABLE upload_sign_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` | Primary key, auto-generated. |
| `user_id` | `uuid` | No | — | FK to `auth.users.id`. The authenticated user who requested the signature. |
| `created_at` | `timestamptz` | No | `now()` | Auto-set on row creation. Used for the 1-hour sliding window rate check. |

### `municipality_boundaries`

Stores administrative boundary polygons for municipality-level geographic scoping. Currently holds Taytay, Rizal only. Used by the `report_within_taytay` CHECK constraint and the `is_within_boundary` RPC function to enforce that all report locations fall within the supported municipality.

```sql
CREATE TABLE municipality_boundaries (
  id          uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text                  NOT NULL,
  province    text                  NOT NULL DEFAULT 'Rizal',
  boundary    geography(Polygon, 4326) NOT NULL,
  center_lat  double precision      NOT NULL,
  center_lng  double precision      NOT NULL,
  zoom_level  integer               NOT NULL DEFAULT 14,
  created_at  timestamptz           NOT NULL DEFAULT now()
);

CREATE INDEX idx_muni_boundary ON municipality_boundaries USING GIST (boundary);
```

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` | Primary key, auto-generated. |
| `name` | `text` | No | — | Municipality name (e.g. "Taytay"). |
| `province` | `text` | No | `'Rizal'` | Province the municipality belongs to. |
| `boundary` | `geography(Polygon, 4326)` | No | — | PostGIS polygon defining the municipality boundary. GIST-indexed for spatial queries. |
| `center_lat` | `double precision` | No | — | Default map center latitude for the municipality. |
| `center_lng` | `double precision` | No | — | Default map center longitude for the municipality. |
| `zoom_level` | `integer` | No | `14` | Default map zoom level for the municipality. |
| `created_at` | `timestamptz` | No | `now()` | Auto-set on row creation. |

### `notifications`

Stores in-app notification records created when a report's status changes or when feedback is acknowledged/closed. One row per status change event per user. Used for the in-app notification center (bell icon, lazy dropdown, mark-as-read, delete) and provides a record of all status change events.

```sql
CREATE TABLE notifications (
  id          uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid              NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_id   uuid              NULL REFERENCES reports(id) ON DELETE CASCADE,
  feedback_id uuid              NULL REFERENCES feedback(id) ON DELETE CASCADE,
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
| `report_id` | `uuid` | Yes | — | FK to `reports.id`. Null for feedback notifications. |
| `feedback_id` | `uuid` | Yes | — | FK to `feedback.id`. Null for report notifications. |
| `type` | `notification_type` | No | — | The event type. Determines the message template. |
| `message` | `text` | No | — | Human-readable notification text generated server-side at creation time. |
| `is_read` | `boolean` | No | `false` | Flipped to `true` when the citizen views the notification. |
| `created_at` | `timestamptz` | No | `now()` | Auto-set on row creation. |

### `feedback`

Stores app feedback submissions from logged-in users (bug reports, feature requests, and general feedback). Admins triage submissions by acknowledging or closing them.

```sql
CREATE TABLE feedback (
  id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            feedback_type   NOT NULL,
  title           text            NOT NULL,
  description     text            NOT NULL,
  rating          smallint        NULL,
  photo_urls      text[]          NOT NULL DEFAULT '{}',
  status          feedback_status NOT NULL DEFAULT 'OPEN',
  admin_note      text            NULL,
  created_at      timestamptz     NOT NULL DEFAULT now(),
  updated_at      timestamptz     NOT NULL DEFAULT now(),

  CONSTRAINT feedback_rating_range CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  CONSTRAINT feedback_title_length CHECK (char_length(title) >= 10 AND char_length(title) <= 100),
  CONSTRAINT feedback_description_length CHECK (char_length(description) >= 20 AND char_length(description) <= 2000)
);
```

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | Primary key, auto-generated. |
| `user_id` | `uuid` | No | — | FK to `auth.users.id`. Cascade deletes when the auth user is deleted. |
| `type` | `feedback_type` | No | — | Bug Report, Feature Request, or General. |
| `title` | `text` | No | — | 10–100 characters. Enforced by `feedback_title_length` constraint and Zod. |
| `description` | `text` | No | — | 20–2000 characters. Enforced by `feedback_description_length` constraint and Zod. |
| `rating` | `smallint` | Yes | `null` | 1–5 star rating. Optional. Enforced by `feedback_rating_range` constraint. |
| `photo_urls` | `text[]` | No | `'{}'` | Cloudinary CDN URLs for uploaded photos. 0–3 items, optional. Uploaded client-side before submission. |
| `status` | `feedback_status` | No | `'OPEN'` | Set by server-side logic only. Never accepted as a client value. |
| `admin_note` | `text` | Yes | `null` | Internal admin note visible to the citizen on the detail page. Set via admin Server Action. |
| `created_at` | `timestamptz` | No | `now()` | Auto-set on row creation. |
| `updated_at` | `timestamptz` | No | `now()` | Must be updated via trigger whenever the row changes. |

---

## Relationships

```
auth.users (Supabase-managed)
  │
  ├── profiles.id                (one-to-one, cascade delete)
  ├── reports.submitted_by_id   (one-to-many, cascade delete)
  ├── reports.reviewed_by_id    (one-to-many, set null on delete)
  ├── report_comments.user_id   (one-to-many, cascade delete)
  ├── report_flags.user_id      (one-to-many, cascade delete)
  ├── upload_sign_log.user_id   (one-to-many, cascade delete)
  ├── feedback.user_id          (one-to-many, cascade delete)
  └── notifications.user_id     (one-to-many, cascade delete)

reports
  ├── report_comments.report_id (one-to-many, cascade delete)
  ├── report_flags.report_id   (one-to-many, cascade delete)
  └── notifications.report_id   (one-to-many, cascade delete)

report_comments
  └── report_comments.parent_id (one-to-many, cascade delete)

upload_sign_log
  — (no child references)

feedback
  └── notifications.feedback_id (one-to-many, cascade delete)
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

-- reports: spatial index for PostGIS ST_DWithin queries (nearby reports on submit)
CREATE INDEX idx_reports_location ON reports USING GIST (location);

-- notifications: citizen fetching their own notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- notifications: filtering unread notifications for badge count
CREATE INDEX idx_notifications_user_id_is_read ON notifications(user_id, is_read);

-- feedback: citizen's own feedback history lookup
CREATE INDEX idx_feedback_user_id ON feedback(user_id);

-- feedback: admin inbox filtering by status
CREATE INDEX idx_feedback_status ON feedback(status);

-- feedback: admin inbox sorted newest first
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);

-- report_comments: listing comments for a report (the primary query)
CREATE INDEX idx_comments_report_id ON report_comments(report_id);

-- report_comments: filtering by user (admin lookups, self-service)
CREATE INDEX idx_comments_user_id ON report_comments(user_id);

-- report_comments: fetching replies for a top-level comment
CREATE INDEX idx_comments_parent_id ON report_comments(parent_id);

-- report_flags: admin lookups of all flags for a report
CREATE INDEX idx_report_flags_report_id ON report_flags(report_id);

-- upload_sign_log: counting requests per user in a time window for rate limiting
CREATE INDEX idx_upload_sign_log_user_created ON upload_sign_log(user_id, created_at);

-- municipality_boundaries: spatial index for ST_Within boundary checks
CREATE INDEX idx_muni_boundary ON municipality_boundaries USING GIST (boundary);
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

### 3. Nearby reports lookup (PostGIS)

Used by the submission form's location picker to show existing approved/resolved reports within a configurable radius when the user pins a location. Called client-side via `supabase.rpc("get_nearby_reports", ...)`.

```sql
CREATE OR REPLACE FUNCTION get_nearby_reports(
  lat double precision,
  lng double precision,
  max_distance_m double precision DEFAULT 200
)
RETURNS TABLE(
  id uuid,
  title text,
  category report_category,
  severity report_severity,
  photo_urls text[],
  latitude double precision,
  longitude double precision,
  location_label text,
  submitted_at timestamptz,
  distance_m double precision
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    id,
    title,
    category,
    severity,
    photo_urls,
    latitude,
    longitude,
    location_label,
    submitted_at,
    ST_Distance(
      location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) AS distance_m
  FROM reports
  WHERE status IN ('APPROVED', 'RESOLVED')
    AND ST_DWithin(
      location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      max_distance_m
    )
  ORDER BY distance_m ASC
  LIMIT 25;
$$;
```

### 4. Municipality boundary check (PostGIS)

Called by the `submitReport` Server Action before insert to verify that the pinned location falls within the supported municipality (currently Taytay, Rizal). Used for application-level enforcement (defense in depth alongside the `trg_reports_location_boundary` database trigger on the `reports` table).

> **Why a trigger instead of a CHECK constraint:** PostgreSQL does not allow subqueries in CHECK constraints. The trigger fires on `BEFORE INSERT OR UPDATE OF latitude, longitude` and rejects the operation if the location falls outside the Taytay boundary.

```sql
CREATE OR REPLACE FUNCTION is_within_boundary(
  lat double precision,
  lng double precision,
  municipality_name text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM municipality_boundaries
    WHERE name = municipality_name
      AND ST_Within(
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geometry,
        boundary::geometry
      )
  );
$$;
```

`SECURITY DEFINER` ensures the function always queries the `municipality_boundaries` table regardless of the caller's RLS context. The function is read-only (`STABLE`) and adds no additional risk — it only returns a boolean based on geometry, never writes data.

Calling pattern:
```sql
-- Returns true if (lat, lng) falls within Taytay
SELECT is_within_boundary(14.5587, 121.1360, 'Taytay');
```

### 5. Report location boundary enforcement (trigger)

Fires before a report row is inserted or its latitude/longitude is updated. Rejects the operation if the pinned location falls outside the Taytay boundary polygon. Acts as database-level defense in depth alongside the application-level check in the `submitReport` Server Action.

```sql
CREATE OR REPLACE FUNCTION check_report_location_boundary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM municipality_boundaries
    WHERE name = 'Taytay'
      AND ST_Within(
        ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geometry,
        boundary::geometry
      )
  ) THEN
    RAISE EXCEPTION 'Report location must be within Taytay, Rizal';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reports_location_boundary
  BEFORE INSERT OR UPDATE OF latitude, longitude ON reports
  FOR EACH ROW
  EXECUTE FUNCTION check_report_location_boundary();
```

> **Why a trigger instead of a CHECK constraint:** PostgreSQL does not allow subqueries in CHECK constraints. The `municipality_boundaries` table must be queried to determine whether a point falls within the boundary, which requires a subquery. A `BEFORE INSERT OR UPDATE OF latitude, longitude` trigger achieves the same effect without this limitation. The trigger only fires when location-changing columns are modified (not on every column update), minimising overhead.
>
> **Why `ST_MakePoint(NEW.longitude, NEW.latitude)` instead of `NEW.location::geometry`:** The `location` column is a generated geography column (`GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED`). On PostgreSQL 17, generated columns are **not** computed before `BEFORE INSERT` triggers fire — `NEW.location` is NULL inside the trigger function. The geometry must be constructed inline from the raw lat/lng columns, matching the approach used by the `is_within_boundary` RPC.

---

## Row Level Security Policies

Enable RLS on all application-owned tables. Admin operations use the service role key (bypasses RLS) exclusively in server-side API route handlers — never in client-side code.

```sql
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback           ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_comments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_flags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_sign_log    ENABLE ROW LEVEL SECURITY;
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
-- Anyone (anon + authenticated) can read approved and resolved reports
CREATE POLICY "Anyone can read approved and resolved reports"
  ON reports FOR SELECT
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

-- Citizens can update their own pending reports (edit typos, photos, pin, etc.)
-- Once reviewed (APPROVED/REJECTED/RESOLVED) the status guard locks the record
CREATE POLICY "Citizens can update their own pending reports"
  ON reports FOR UPDATE
  TO authenticated
  USING (auth.uid() = submitted_by_id AND status = 'PENDING')
  WITH CHECK (auth.uid() = submitted_by_id);
```

> **Note:** These three policies (plus `ALTER TABLE reports ENABLE ROW LEVEL SECURITY;`) were materialized as a single migration `20250713000009` — they were documented here earlier but never created in the database, causing `submitReport` inserts to fail with default-deny RLS.

**Column-level note on `rejection_reason`:** RLS operates at the row level — it cannot hide individual columns from a query. The `rejection_reason` field must be excluded at the application layer:
- Public feed API routes must never include `rejection_reason` in the Supabase `.select()` call.
- Citizen own-report queries may include `rejection_reason` since the RLS policy already limits results to that citizen's own rows.
- Admin queries use the service role and have full column access.

---

### `report_flags` RLS

```sql
-- Citizens can insert their own flags
CREATE POLICY "Citizens can insert flags"
  ON report_flags FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Citizens can read their own flags
CREATE POLICY "Citizens can read own flags"
  ON report_flags FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Citizens can switch their own flag type
CREATE POLICY "Citizens can update own flags"
  ON report_flags FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Citizens can remove their own flag
CREATE POLICY "Citizens can delete own flags"
  ON report_flags FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

Note: All flag operations are performed by the `flagReport` Server Action using the anon-key server client — INSERT (first flag), UPDATE (switch type), and DELETE (unflag) are each governed by their matching RLS policy with the citizen's own session. The citizen's browser reads their flag on mount via SELECT. Admins read all flags via the service role client (bypasses RLS). Migration `20250731000001` added the UPDATE/DELETE policies; without them the toggle's switch/unflag branches were silently rejected by RLS default-deny (same class of bug as the missing `reports` UPDATE policy).

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

-- Citizens can delete their own notifications
CREATE POLICY "Citizens can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

Note: Notifications are created by admin Server Actions using the service role client. There is no insert policy for authenticated users — citizens cannot create notifications directly. Citizens can read, update (mark as read), and delete their own notifications via the anon-key server client, governed by the SELECT, UPDATE, and DELETE RLS policies.

---

### `feedback` RLS

```sql
-- Citizens can read their own feedback
CREATE POLICY "Citizens can read own feedback"
  ON feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Authenticated users can insert feedback
CREATE POLICY "Authenticated users can insert feedback"
  ON feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

Note: Feedback entries are inserted by the `submitFeedback` Server Action using the anon-key server client, governed by the INSERT RLS policy. Admin operations (status changes, admin_note updates) use the service role client to bypass RLS. There is no UPDATE or DELETE policy for authenticated users — citizens cannot edit or delete their feedback after submission.

---

### `report_comments` RLS

```sql
-- Anyone can read active comments on approved/resolved reports
CREATE POLICY "Anyone can read active comments on approved reports"
  ON report_comments FOR SELECT
  USING (
    status = 'ACTIVE' AND EXISTS (
      SELECT 1 FROM reports WHERE reports.id = report_id AND reports.status IN ('APPROVED', 'RESOLVED')
    )
  );

-- Authenticated users can insert comments on approved/resolved reports only
CREATE POLICY "Authenticated users can insert comments"
  ON report_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM reports WHERE reports.id = report_id AND reports.status IN ('APPROVED', 'RESOLVED')
    )
  );

-- Users can update own comments (body edit, not status)
CREATE POLICY "Users can update own comments"
  ON report_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND status = 'ACTIVE');

-- Users can delete own comments
CREATE POLICY "Users can delete own comments"
  ON report_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

Note: Admin soft-delete (setting `status = 'REMOVED'`) uses the service role client via `removeComment` Server Action in `app/admin/actions.ts`. There is no admin-specific RLS policy — admin mutations bypass RLS entirely.

---

### `upload_sign_log` RLS

```sql
-- Users can insert their own sign request log entries
CREATE POLICY "Users can insert own sign log"
  ON upload_sign_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own sign request log entries
CREATE POLICY "Users can read own sign log"
  ON upload_sign_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

Note: The `upload_sign_log` table is used exclusively for rate limiting the `/api/uploads/sign` endpoint. Rows are inserted by the route handler using the anon-key server client (governed by the INSERT RLS policy) and queried for the 30-requests-per-hour rate check (governed by the SELECT RLS policy).

---

## Business Validation Rules

These rules are enforced at two levels: database constraints (defined above) and Zod schemas (in `lib/validations/`). Both layers must agree. If a constraint exists in the database, the corresponding Zod rule must exist too — and vice versa.

| Field | Rule | Enforced By |
|---|---|---|
| `profiles.full_name` | Required, non-empty | Zod (registration form) |
| `reports.title` | Required, 5–100 characters | DB constraint + Zod |
| `reports.description` | Required, 20–1000 characters | DB constraint + Zod |
| `reports.category` | Must match a valid enum value | DB enum type + Zod |
| `reports.severity` | Must match a valid enum value | DB enum type + Zod |
| `reports.photo_urls` | Array of 1–3 valid URLs | DB constraint + Zod |
| `reports.latitude` | Between -90 and 90 | DB constraint + Zod |
| `reports.longitude` | Between -180 and 180 | DB constraint + Zod |
| `reports.rejection_reason` | Required (min 10 chars) when status is `REJECTED` | DB constraint + Zod |
| `reports.status` | Set server-side only — never accepted from client | API route handler |
| `profiles.role` | Set via seed or Supabase Studio only — never accepted from client | API route handler + no RLS update policy for role |
| `reports.barangay` | Must match a valid barangay enum value | DB enum type + Zod |
| `reports.location` | Must fall within Taytay boundary polygon | DB trigger (`trg_reports_location_boundary` on INSERT/UPDATE of latitude/longitude) + Server Action (`is_within_boundary` RPC call) |
| Report submission rate | Max 5 submissions per user per 24-hour window | API route handler (count query before insert) |
| `feedback.title` | Required, 10–100 characters | DB constraint + Zod |
| `feedback.description` | Required, 20–2000 characters | DB constraint + Zod |
| `feedback.rating` | Optional, 1–5 (if provided) | DB constraint + Zod |
| `feedback.type` | Must match a valid enum value | DB enum type + Zod |
| `feedback.status` | Set server-side only — never accepted from client | Server Action handler |
| Feedback submission rate | Max 3 submissions per user per 24-hour window | Server Action (count query before insert) |
| `report_comments.body` | Required, 1–2000 characters | DB constraint + server-side validation |
| `report_comments.status` | Must match a valid enum value | DB enum type + server-side enforcement |
| Comment ownership | Only the comment author can edit or delete a comment | RLS policy on `report_comments` |
| Comment admin removal | Admins can set status to `REMOVED` via service role client | Server Action handler (`verifyAdmin()` + service role update) |
| Comment notification | Report owner receives in-app notification when someone comments on their report (not on own comment) | Server Action (`addComment` checks `submitted_by_id !== user.id`) |
| Comment submission rate | Max 30 comments per user per 24-hour window | Server Action (`addComment` — count query before insert) |
| `report_flags.flag_type` | Must be `ALREADY_FIXED` or `WRONG_LOCATION` | DB enum type + Zod (`flagReportSchema`) |
| `report_flags.report_id` + `user_id` + `flag_type` | One flag per citizen per report per type | DB `UNIQUE (report_id, user_id, flag_type)` constraint |
| Report flag ownership | Only the flagger can create/toggle their own flag | RLS policies on `report_flags` + Server Action (`flagReport` checks `auth.uid()` = `user_id`) |
| Report flag target status | Only `APPROVED`/`RESOLVED` reports can be flagged | Server Action (`flagReport` status check) |
| Upload sign request rate | Max 30 signature requests per user per 1-hour window | API route handler (`GET /api/uploads/sign` — count query on `upload_sign_log` before generating signature) |

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
