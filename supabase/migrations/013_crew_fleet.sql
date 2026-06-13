-- PrismJet Crew operational fleet + performance grids

CREATE TYPE crew_fleet_status AS ENUM ('active', 'retired');
CREATE TYPE crew_performance_metric AS ENUM ('takeoffFieldLength', 'landingDistance');

CREATE TABLE crew_aircraft_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  manufacturer TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE crew_fleet_aircraft (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tail_number TEXT NOT NULL UNIQUE,
  aircraft_type_id UUID NOT NULL REFERENCES crew_aircraft_types(id) ON DELETE RESTRICT,
  status crew_fleet_status NOT NULL DEFAULT 'active',
  home_base TEXT,
  serial_number TEXT,
  operating JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX crew_fleet_aircraft_type_idx ON crew_fleet_aircraft(aircraft_type_id);

CREATE TABLE crew_performance_grids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aircraft_type_id UUID NOT NULL REFERENCES crew_aircraft_types(id) ON DELETE CASCADE,
  metric crew_performance_metric NOT NULL,
  unit TEXT NOT NULL DEFAULT 'ft',
  pressure_altitude_ft INT[] NOT NULL,
  weight_lb INT[] NOT NULL,
  oat_c INT[] NOT NULL,
  values JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (aircraft_type_id, metric)
);
