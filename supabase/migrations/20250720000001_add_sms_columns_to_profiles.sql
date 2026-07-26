ALTER TABLE profiles
  ADD COLUMN phone text NULL,
  ADD COLUMN sms_notifications boolean NOT NULL DEFAULT false;

CREATE INDEX idx_profiles_phone ON profiles(phone);