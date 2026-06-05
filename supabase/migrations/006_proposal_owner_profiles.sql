-- Per-aircraft owner profiles for shared-ownership pro forma
CREATE TABLE IF NOT EXISTS proposal_owner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  aircraft_instance_id UUID NOT NULL REFERENCES aircraft_instances(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  display_name TEXT NOT NULL,
  annual_flight_hours NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ownership_percent NUMERIC(5, 2) NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, aircraft_instance_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_proposal_owner_profiles_aircraft
  ON proposal_owner_profiles (proposal_id, aircraft_instance_id);
