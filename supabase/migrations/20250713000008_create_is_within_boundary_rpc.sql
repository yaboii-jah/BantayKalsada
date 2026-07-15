-- Migration: Create RPC function to check if coordinates fall within a municipality boundary

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
