-- Draft/publish status, pro forma field visibility, nullable aircraft fields for drafts

CREATE TYPE "WarehouseAircraftStatus" AS ENUM ('draft', 'published');

ALTER TABLE warehouse_aircraft
  ADD COLUMN IF NOT EXISTS status "WarehouseAircraftStatus" NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS proforma_field_visibility JSONB;

UPDATE warehouse_aircraft SET status = 'published' WHERE status IS NULL OR status = 'draft';

-- Relax NOT NULL on fields optional for draft saves
ALTER TABLE warehouse_aircraft
  ALTER COLUMN manufacturer DROP NOT NULL,
  ALTER COLUMN model DROP NOT NULL,
  ALTER COLUMN model_code DROP NOT NULL,
  ALTER COLUMN aircraft_category DROP NOT NULL,
  ALTER COLUMN aircraft_category DROP DEFAULT,
  ALTER COLUMN passenger_capacity DROP NOT NULL,
  ALTER COLUMN empty_range DROP NOT NULL,
  ALTER COLUMN range_at_max_passengers DROP NOT NULL,
  ALTER COLUMN crew_count DROP NOT NULL,
  ALTER COLUMN square_footage DROP NOT NULL,
  ALTER COLUMN average_cruise_speed DROP NOT NULL,
  ALTER COLUMN wifi DROP NOT NULL,
  ALTER COLUMN wifi DROP DEFAULT,
  ALTER COLUMN fuel_gallons_per_hour DROP NOT NULL,
  ALTER COLUMN lead_pilot_count DROP NOT NULL,
  ALTER COLUMN pic_count DROP NOT NULL,
  ALTER COLUMN sic_count DROP NOT NULL,
  ALTER COLUMN lead_pilot_salary DROP NOT NULL,
  ALTER COLUMN pic_salary DROP NOT NULL,
  ALTER COLUMN sic_salary DROP NOT NULL,
  ALTER COLUMN pic_training_cost DROP NOT NULL,
  ALTER COLUMN sic_training_cost DROP NOT NULL,
  ALTER COLUMN max_usage_1_pilot DROP NOT NULL,
  ALTER COLUMN max_usage_2_pilots DROP NOT NULL,
  ALTER COLUMN max_usage_3_pilots DROP NOT NULL,
  ALTER COLUMN max_usage_4_pilots DROP NOT NULL,
  ALTER COLUMN max_usage_5_pilots DROP NOT NULL,
  ALTER COLUMN max_usage_6_pilots DROP NOT NULL,
  ALTER COLUMN charter_payback_basis DROP NOT NULL,
  ALTER COLUMN charter_payback_basis DROP DEFAULT,
  ALTER COLUMN fuel_surcharge_payback_basis DROP NOT NULL,
  ALTER COLUMN fuel_surcharge_payback_basis DROP DEFAULT;
