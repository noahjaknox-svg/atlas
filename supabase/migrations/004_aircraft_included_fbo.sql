ALTER TABLE aircraft_instances ADD COLUMN IF NOT EXISTS included_on_proposal BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE aircraft_instances ADD COLUMN IF NOT EXISTS fbo_name TEXT;
