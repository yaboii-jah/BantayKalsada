-- Migration: Create trigger function + trigger to enforce Taytay boundary on reports
--
-- PostgreSQL does not allow subqueries in CHECK constraints, so this must
-- be enforced via a BEFORE INSERT/UPDATE trigger instead.
--
-- Related:
--   - Application-level check: is_within_boundary RPC (called in submitReport
--     Server Action before insert)
--   - This trigger acts as defense-in-depth at the database level

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
