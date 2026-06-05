-- Per-aircraft client portal presentation fields
ALTER TABLE aircraft_instances
  ADD COLUMN IF NOT EXISTS portal_image_url TEXT,
  ADD COLUMN IF NOT EXISTS portal_video_url TEXT,
  ADD COLUMN IF NOT EXISTS portal_spec_highlights JSONB;
