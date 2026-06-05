-- Atlas aircraft reference data schema extensions

CREATE TYPE hangar_pricing_method AS ENUM ('quoted', 'sqft_rate', 'category_estimate');

ALTER TABLE aircraft_master
  ADD COLUMN IF NOT EXISTS cabin_sqft INTEGER,
  ADD COLUMN IF NOT EXISTS typical_hull_value DECIMAL(14, 2);

ALTER TABLE hangar_costs
  ADD COLUMN IF NOT EXISTS fbo_location_id UUID REFERENCES fbo_locations(id),
  ADD COLUMN IF NOT EXISTS pricing_method hangar_pricing_method NOT NULL DEFAULT 'category_estimate',
  ADD COLUMN IF NOT EXISTS quoted_annual DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS rate_per_sqft_annual DECIMAL(10, 4);

CREATE INDEX IF NOT EXISTS hangar_costs_lookup_idx
  ON hangar_costs (airport_id, aircraft_master_id, fbo_location_id);

CREATE TABLE IF NOT EXISTS aircraft_operating_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aircraft_master_id UUID NOT NULL REFERENCES aircraft_master(id) ON DELETE CASCADE,
  cost_key TEXT NOT NULL,
  annual_amount DECIMAL(12, 2) NOT NULL,
  source TEXT,
  confidence TEXT NOT NULL DEFAULT 'medium',
  effective_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (aircraft_master_id, cost_key, effective_date)
);

CREATE TABLE IF NOT EXISTS airport_fee_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_id UUID NOT NULL REFERENCES airports(id) ON DELETE CASCADE,
  annual_fee DECIMAL(12, 2) NOT NULL,
  source TEXT,
  effective_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (airport_id, effective_date)
);

ALTER TABLE state_cost_factors
  ADD COLUMN IF NOT EXISTS registration_tax_rate_pct DECIMAL(6, 4),
  ADD COLUMN IF NOT EXISTS jet_fuel_tax_differential_per_gal DECIMAL(6, 4);

CREATE TABLE IF NOT EXISTS scenario_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  aircraft_master_id UUID NOT NULL REFERENCES aircraft_master(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scenario_template_assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES scenario_templates(id) ON DELETE CASCADE,
  assumption_key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, assumption_key)
);
