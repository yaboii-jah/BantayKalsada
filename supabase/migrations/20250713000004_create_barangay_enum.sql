-- Migration: Create barangay enum for Taytay, Rizal municipality scope

CREATE TYPE barangay AS ENUM (
  'DOLORES',
  'SAN_ISIDRO',
  'SAN_JUAN',
  'SANTA_ANA',
  'MUZON'
);
  