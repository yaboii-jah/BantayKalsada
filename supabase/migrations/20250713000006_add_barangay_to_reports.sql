-- Migration: Add barangay column to reports table

ALTER TABLE reports ADD COLUMN barangay barangay;
