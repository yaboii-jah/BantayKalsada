-- Migration: Baseline schema for dashboard-created tables (reproducibility fix)
--
-- PROBLEM: The base schema for `profiles`, `reports`, and `notifications` plus the
-- enums `user_role`, `report_category`, `report_status`, and `notification_type`,
-- the `handle_new_user` / `set_updated_at` functions, their triggers, and the RLS
-- policies for `profiles` and `notifications` were created in the Supabase
-- dashboard, NOT in any migration. `supabase db reset` / fresh provisioning
-- therefore fails on the very first ALTER that touches these tables, and the
-- documented RLS could not be reproduced from migrations (security audit finding 9).
--
-- FIX: Capture the ORIGINAL table definitions (before the incremental feature
-- migrations added columns) so the existing ALTER migrations still apply cleanly
-- on a fresh database. Everything is idempotent:
--   * `CREATE TABLE IF NOT EXISTS` / `CREATE TYPE` guarded by DO blocks
--   * `DROP TRIGGER IF EXISTS` / `DROP POLICY IF EXISTS` before CREATE
-- On the live linked database this migration is a no-op that re-asserts the
-- documented policies; on a fresh database it recreates the base and the
-- incremental migrations build the rest on top.
--
-- NOTE: The `report_within_taytay_check CHECK (location IS NOT NULL)` constraint
-- that exists on the live `reports` table cannot be recreated here because the
-- generated `location` column is added later by migration
-- 20250713000002_add_report_location.sql. Boundary enforcement is still covered
-- by the `is_within_boundary` RPC + `trg_reports_location_boundary` DB trigger.

-- ============================ ENUMS ============================
-- report_severity, comment_status, barangay, report_flag_type,
-- report_activity_action, feedback_type, feedback_status are created by
-- feature migrations; only the missing base enums are created here.
-- ALTER TYPE ... ADD VALUE migrations all use IF NOT EXISTS, so creating
-- notification_type with the full value set is safe.

DO $$
BEGIN
  CREATE TYPE user_role AS ENUM ('CITIZEN', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE report_category AS ENUM (
    'POTHOLE', 'FLOODED_ROAD', 'ROAD_ACCIDENT', 'ROAD_RAGE',
    'BROKEN_TRAFFIC_SIGN', 'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE report_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RESOLVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE notification_type AS ENUM (
    'COMMENT_ADDED', 'REPORT_APPROVED', 'REPORT_REJECTED', 'REPORT_RESOLVED',
    'REPORT_FLAGGED', 'FEEDBACK_ACKNOWLEDGED', 'FEEDBACK_CLOSED',
    'FEEDBACK_NOTE_ADDED', 'OFFLINE_SUBMIT_FAILED', 'REPORT_EDITED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================ REPORTS (base) ============================
-- Original definition BEFORE feature migrations added: severity
-- (20250710000002), location (20250713000002), barangay (20250713000006),
-- resolution_notes/resolved_image_urls (20250719000001),
-- duplicate_of_id (20260809000002).

CREATE TABLE IF NOT EXISTS reports (
  id                uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text             NOT NULL,
  description       text             NOT NULL,
  category          report_category  NOT NULL,
  status            report_status    NOT NULL DEFAULT 'PENDING',
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

-- ============================ PROFILES ============================
-- Original definition BEFORE 20250720000001 added phone + sms_notifications.

CREATE TABLE IF NOT EXISTS profiles (
  id            uuid          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     text          NOT NULL DEFAULT '',
  email         text          NOT NULL DEFAULT '',
  role          user_role     NOT NULL DEFAULT 'CITIZEN',
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now()
);

-- ============================ NOTIFICATIONS ============================
-- Original definition BEFORE 20250709000002 dropped NOT NULL on report_id and
-- added feedback_id; BEFORE 20250806000001 added offline_queue_id.

CREATE TABLE IF NOT EXISTS notifications (
  id               uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid              NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_id        uuid              NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  type             notification_type NOT NULL,
  message          text              NOT NULL,
  is_read          boolean           NOT NULL DEFAULT false,
  created_at       timestamptz       NOT NULL DEFAULT now()
);

-- ============================ FUNCTIONS & TRIGGERS ============================

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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

-- ============================ RLS & POLICIES ============================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Citizens can read own profile" ON profiles;
CREATE POLICY "Citizens can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Citizens can update own profile" ON profiles;
CREATE POLICY "Citizens can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Citizens can read own notifications" ON notifications;
CREATE POLICY "Citizens can read own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Citizens can update own notifications" ON notifications;
CREATE POLICY "Citizens can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE policy already exists via 20250712000001; re-asserted here for completeness
DROP POLICY IF EXISTS "Citizens can delete own notifications" ON notifications;
CREATE POLICY "Citizens can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
