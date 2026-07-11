CREATE TYPE report_severity AS ENUM ('MINOR', 'URGENT', 'EMERGENCY');

ALTER TABLE reports ADD COLUMN severity report_severity NOT NULL DEFAULT 'MINOR';
