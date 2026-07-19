ALTER TABLE reports
  ADD COLUMN resolution_notes text,
  ADD COLUMN resolved_image_urls text[] DEFAULT '{}';
