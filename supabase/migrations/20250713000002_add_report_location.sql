-- Migration: Add geography column and spatial index to reports

ALTER TABLE reports ADD COLUMN location geography(Point, 4326)
  GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED;

CREATE INDEX idx_reports_location ON reports USING GIST (location);
