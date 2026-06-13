-- Verified runway slopes for Crew API; estimated from OurAirports is admin-only.
ALTER TABLE airport_runway_reference
  ADD COLUMN IF NOT EXISTS gradient_pct_verified DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS gradient_high_end_verified TEXT,
  ADD COLUMN IF NOT EXISTS gradient_pct_estimated DOUBLE PRECISION;
