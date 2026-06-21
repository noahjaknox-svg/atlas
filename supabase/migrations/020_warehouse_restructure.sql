-- Warehouse restructure to match Atlas Database.xlsx
-- Consolidates the granular reference tables into a single warehouse_aircraft
-- record plus flat fbos and company_settings tables. Starts data fresh.

-- 1. Repoint aircraft_instances off aircraft_master onto warehouse_aircraft.
ALTER TABLE aircraft_instances DROP COLUMN IF EXISTS aircraft_master_id;
ALTER TABLE aircraft_instances ADD COLUMN IF NOT EXISTS warehouse_aircraft_id uuid;

-- 2. Drop obsolete reference tables (CASCADE clears dependent FKs/constraints).
DROP TABLE IF EXISTS charter_market_rates CASCADE;
DROP TABLE IF EXISTS program_costs CASCADE;
DROP TABLE IF EXISTS scenario_template_assumptions CASCADE;
DROP TABLE IF EXISTS scenario_templates CASCADE;
DROP TABLE IF EXISTS state_cost_factors CASCADE;
DROP TABLE IF EXISTS insurance_assumptions CASCADE;
DROP TABLE IF EXISTS training_costs CASCADE;
DROP TABLE IF EXISTS crew_rates CASCADE;
DROP TABLE IF EXISTS airport_fee_schedules CASCADE;
DROP TABLE IF EXISTS aircraft_operating_defaults CASCADE;
DROP TABLE IF EXISTS hangar_costs CASCADE;
DROP TABLE IF EXISTS fuel_prices CASCADE;
DROP TABLE IF EXISTS fuel_index_snapshots CASCADE;
DROP TABLE IF EXISTS fbo_locations CASCADE;
DROP TABLE IF EXISTS aircraft_master CASCADE;
DROP TABLE IF EXISTS airports CASCADE;

-- 3. New enum for charter / fuel-surcharge payback basis.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaybackBasis') THEN
    CREATE TYPE "PaybackBasis" AS ENUM ('block_time', 'flight_time');
  END IF;
END$$;

-- 4. Consolidated warehouse aircraft (Aircraft tab).
CREATE TABLE IF NOT EXISTS warehouse_aircraft (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name                text NOT NULL UNIQUE,
  manufacturer                text NOT NULL,
  model                       text NOT NULL,
  model_code                  text NOT NULL,
  aircraft_category           "AircraftCategory" NOT NULL DEFAULT 'midsize_jet',
  passenger_capacity          integer NOT NULL,
  empty_range                 integer NOT NULL,
  range_at_max_passengers     integer NOT NULL,
  crew_count                  integer NOT NULL,
  square_footage              integer NOT NULL,
  average_cruise_speed        integer NOT NULL,
  wifi                        boolean NOT NULL DEFAULT true,
  fuel_gallons_per_hour       integer NOT NULL,
  parts_program               integer,
  engine_program              integer,
  apu_program                 integer,
  inspection_reserve          integer,
  trip_expense_hourly         integer,
  lead_pilot_count            integer NOT NULL,
  pic_count                   integer NOT NULL,
  sic_count                   integer NOT NULL,
  cabin_attendant_count       integer,
  lead_pilot_salary           integer NOT NULL,
  pic_salary                  integer NOT NULL,
  sic_salary                  integer NOT NULL,
  cabin_attendant_salary      integer,
  pic_training_cost           integer NOT NULL,
  sic_training_cost           integer NOT NULL,
  max_usage_1_pilot           integer NOT NULL,
  max_usage_2_pilots          integer NOT NULL,
  max_usage_3_pilots          integer NOT NULL,
  max_usage_4_pilots          integer NOT NULL,
  max_usage_5_pilots          integer NOT NULL,
  max_usage_6_pilots          integer NOT NULL,
  average_cost                integer,
  charter_hourly_rate         integer,
  charter_payback_basis       "PaybackBasis" NOT NULL DEFAULT 'block_time',
  fuel_surcharge_payback_basis "PaybackBasis" NOT NULL DEFAULT 'block_time',
  fuel_surcharge              integer,
  pilot_charter_incentive     integer,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- 5. FBOs (FBOs tab).
CREATE TABLE IF NOT EXISTS fbos (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fbo_name             text NOT NULL,
  airport_icao         text NOT NULL,
  base_fuel_rate       numeric(10,4) NOT NULL,
  hangar_cost_per_sqft numeric(10,4),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fbo_name, airport_icao)
);
CREATE INDEX IF NOT EXISTS idx_fbos_airport_icao ON fbos (airport_icao);

-- 6. Per-aircraft hangar override (Specific Hangar Rate).
CREATE TABLE IF NOT EXISTS fbo_hangar_overrides (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fbo_id                uuid NOT NULL REFERENCES fbos(id) ON DELETE CASCADE,
  warehouse_aircraft_id uuid NOT NULL REFERENCES warehouse_aircraft(id) ON DELETE CASCADE,
  annual_rate           integer NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fbo_id, warehouse_aircraft_id)
);

-- 7. Single-row company settings (General and Company tab).
CREATE TABLE IF NOT EXISTS company_settings (
  id                                 text PRIMARY KEY DEFAULT 'default',
  us_average_fuel_cost               numeric(10,4) NOT NULL DEFAULT 5.5,
  annual_management_fee              integer NOT NULL DEFAULT 120000,
  annual_maintenance_management_fee  integer NOT NULL DEFAULT 60000,
  charter_payback_percent            numeric(6,3) NOT NULL DEFAULT 82.5,
  crew_benefits_percent              numeric(6,4) NOT NULL DEFAULT 0.16,
  fuel_tax_refund                    numeric(10,4) NOT NULL DEFAULT 0.175,
  updated_at                         timestamptz NOT NULL DEFAULT now()
);
INSERT INTO company_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

-- 8. FK for aircraft_instances -> warehouse_aircraft.
ALTER TABLE aircraft_instances
  ADD CONSTRAINT aircraft_instances_warehouse_aircraft_id_fkey
  FOREIGN KEY (warehouse_aircraft_id) REFERENCES warehouse_aircraft(id);
