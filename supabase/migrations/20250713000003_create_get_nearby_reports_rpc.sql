-- Migration: Create RPC function to find nearby approved/resolved reports

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
