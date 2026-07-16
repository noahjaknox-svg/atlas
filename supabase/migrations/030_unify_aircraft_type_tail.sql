-- Unify Aircraft Type + Tail: promote crew catalogs, fold warehouse + empty-leg fleet/pricing.

DO $$ BEGIN
  ALTER TYPE "WarehouseAircraftStatus" RENAME TO "AircraftTypeStatus";
EXCEPTION WHEN undefined_object THEN NULL;
WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AircraftTypeStatus" AS ENUM ('draft', 'published');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AircraftTailStatus" AS ENUM ('active', 'retired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AircraftPerformanceMetric" AS ENUM ('takeoffFieldLength', 'landingDistance');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1) Rename crew tables → warehouse masters
ALTER TABLE IF EXISTS "crew_aircraft_types" RENAME TO "aircraft_types";
ALTER TABLE IF EXISTS "crew_fleet_aircraft" RENAME TO "aircraft_tails";
ALTER TABLE IF EXISTS "crew_performance_grids" RENAME TO "aircraft_performance_grids";

-- Rename crew status/metric enums if present
DO $$ BEGIN
  ALTER TYPE "CrewFleetStatus" RENAME TO "AircraftTailStatus";
EXCEPTION WHEN undefined_object THEN NULL;
WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "CrewPerformanceMetric" RENAME TO "AircraftPerformanceMetric";
EXCEPTION WHEN undefined_object THEN NULL;
WHEN duplicate_object THEN NULL;
END $$;

-- 2) AircraftType: AM / empty-leg / external columns
ALTER TABLE "aircraft_types"
  ADD COLUMN IF NOT EXISTS "status" "AircraftTypeStatus" NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS "display_name" TEXT,
  ADD COLUMN IF NOT EXISTS "proforma_field_visibility" JSONB,
  ADD COLUMN IF NOT EXISTS "model_code" TEXT,
  ADD COLUMN IF NOT EXISTS "aircraft_category" TEXT,
  ADD COLUMN IF NOT EXISTS "passenger_capacity" INTEGER,
  ADD COLUMN IF NOT EXISTS "empty_range" INTEGER,
  ADD COLUMN IF NOT EXISTS "range_at_max_passengers" INTEGER,
  ADD COLUMN IF NOT EXISTS "crew_count" INTEGER,
  ADD COLUMN IF NOT EXISTS "square_footage" INTEGER,
  ADD COLUMN IF NOT EXISTS "average_cruise_speed" INTEGER,
  ADD COLUMN IF NOT EXISTS "wifi" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "home_fuel_pct" INTEGER,
  ADD COLUMN IF NOT EXISTS "fuel_gallons_per_hour" INTEGER,
  ADD COLUMN IF NOT EXISTS "parts_program" INTEGER,
  ADD COLUMN IF NOT EXISTS "engine_program" INTEGER,
  ADD COLUMN IF NOT EXISTS "apu_program" INTEGER,
  ADD COLUMN IF NOT EXISTS "inspection_reserve" INTEGER,
  ADD COLUMN IF NOT EXISTS "trip_expense_hourly" INTEGER,
  ADD COLUMN IF NOT EXISTS "default_minimum_crew" INTEGER,
  ADD COLUMN IF NOT EXISTS "lead_pilot_salary" INTEGER,
  ADD COLUMN IF NOT EXISTS "lead_pilot_training_cost" INTEGER,
  ADD COLUMN IF NOT EXISTS "pic_salary" INTEGER,
  ADD COLUMN IF NOT EXISTS "sic_salary" INTEGER,
  ADD COLUMN IF NOT EXISTS "cabin_attendant_salary" INTEGER,
  ADD COLUMN IF NOT EXISTS "pic_training_cost" INTEGER,
  ADD COLUMN IF NOT EXISTS "sic_training_cost" INTEGER,
  ADD COLUMN IF NOT EXISTS "max_usage_1_pilot" INTEGER,
  ADD COLUMN IF NOT EXISTS "max_usage_2_pilots" INTEGER,
  ADD COLUMN IF NOT EXISTS "max_usage_3_pilots" INTEGER,
  ADD COLUMN IF NOT EXISTS "max_usage_4_pilots" INTEGER,
  ADD COLUMN IF NOT EXISTS "max_usage_5_pilots" INTEGER,
  ADD COLUMN IF NOT EXISTS "max_usage_6_pilots" INTEGER,
  ADD COLUMN IF NOT EXISTS "average_cost" INTEGER,
  ADD COLUMN IF NOT EXISTS "charter_hourly_rate" INTEGER,
  ADD COLUMN IF NOT EXISTS "charter_payback_basis" TEXT,
  ADD COLUMN IF NOT EXISTS "fuel_surcharge_payback_basis" TEXT,
  ADD COLUMN IF NOT EXISTS "fuel_surcharge" INTEGER,
  ADD COLUMN IF NOT EXISTS "pilot_charter_incentive" INTEGER,
  ADD COLUMN IF NOT EXISTS "airframe_program" INTEGER,
  ADD COLUMN IF NOT EXISTS "maintenance_reserve" INTEGER,
  ADD COLUMN IF NOT EXISTS "default_cabin_attendant_count" INTEGER,
  ADD COLUMN IF NOT EXISTS "wifi_annual" INTEGER,
  ADD COLUMN IF NOT EXISTS "subscriptions_annual" INTEGER,
  ADD COLUMN IF NOT EXISTS "cleaning_annual" INTEGER,
  ADD COLUMN IF NOT EXISTS "supplies_annual" INTEGER,
  ADD COLUMN IF NOT EXISTS "airport_fees_annual" INTEGER,
  ADD COLUMN IF NOT EXISTS "empty_leg_hourly_rate" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "empty_leg_minimum_hours" DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS "empty_leg_off_routing_hours" DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS "external_source" TEXT DEFAULT 'atlas',
  ADD COLUMN IF NOT EXISTS "external_id" TEXT,
  ADD COLUMN IF NOT EXISTS "external_synced_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "legacy_warehouse_aircraft_id" UUID;

-- code was NOT NULL; make nullable so warehouse-only types can exist without a crew code
ALTER TABLE "aircraft_types" ALTER COLUMN "code" DROP NOT NULL;
ALTER TABLE "aircraft_types" ALTER COLUMN "manufacturer" DROP NOT NULL;
ALTER TABLE "aircraft_types" ALTER COLUMN "model" DROP NOT NULL;

-- Backfill display_name from manufacturer+model or code
UPDATE "aircraft_types"
SET "display_name" = COALESCE(
  NULLIF(TRIM(COALESCE("manufacturer", '') || ' ' || COALESCE("model", '')), ''),
  "code",
  "id"::text
)
WHERE "display_name" IS NULL;

ALTER TABLE "aircraft_types" ALTER COLUMN "display_name" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "aircraft_types_display_name_key" ON "aircraft_types"("display_name");
CREATE UNIQUE INDEX IF NOT EXISTS "aircraft_types_legacy_warehouse_aircraft_id_key"
  ON "aircraft_types"("legacy_warehouse_aircraft_id");

-- 3) Merge warehouse_aircraft rows into aircraft_types
INSERT INTO "aircraft_types" (
  "id", "status", "code", "display_name", "proforma_field_visibility",
  "manufacturer", "model", "model_code", "aircraft_category",
  "passenger_capacity", "max_passengers", "empty_range", "range_at_max_passengers",
  "crew_count", "square_footage", "average_cruise_speed", "wifi", "home_fuel_pct",
  "fuel_gallons_per_hour", "parts_program", "engine_program", "apu_program",
  "inspection_reserve", "trip_expense_hourly", "default_minimum_crew",
  "lead_pilot_salary", "lead_pilot_training_cost", "pic_salary", "sic_salary",
  "cabin_attendant_salary", "pic_training_cost", "sic_training_cost",
  "max_usage_1_pilot", "max_usage_2_pilots", "max_usage_3_pilots",
  "max_usage_4_pilots", "max_usage_5_pilots", "max_usage_6_pilots",
  "average_cost", "charter_hourly_rate", "charter_payback_basis",
  "fuel_surcharge_payback_basis", "fuel_surcharge", "pilot_charter_incentive",
  "airframe_program", "maintenance_reserve", "default_cabin_attendant_count",
  "wifi_annual", "subscriptions_annual", "cleaning_annual", "supplies_annual",
  "airport_fees_annual", "legacy_warehouse_aircraft_id", "external_source",
  "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  w."status"::text::"AircraftTypeStatus",
  NULLIF(TRIM(w."model_code"), ''),
  w."display_name",
  w."proforma_field_visibility",
  w."manufacturer",
  w."model",
  w."model_code",
  w."aircraft_category"::text,
  w."passenger_capacity",
  w."passenger_capacity",
  w."empty_range",
  w."range_at_max_passengers",
  w."crew_count",
  w."square_footage",
  w."average_cruise_speed",
  w."wifi",
  w."home_fuel_pct",
  w."fuel_gallons_per_hour",
  w."parts_program",
  w."engine_program",
  w."apu_program",
  w."inspection_reserve",
  w."trip_expense_hourly",
  w."default_minimum_crew",
  w."lead_pilot_salary",
  w."lead_pilot_training_cost",
  w."pic_salary",
  w."sic_salary",
  w."cabin_attendant_salary",
  w."pic_training_cost",
  w."sic_training_cost",
  w."max_usage_1_pilot",
  w."max_usage_2_pilots",
  w."max_usage_3_pilots",
  w."max_usage_4_pilots",
  w."max_usage_5_pilots",
  w."max_usage_6_pilots",
  w."average_cost",
  w."charter_hourly_rate",
  w."charter_payback_basis"::text,
  w."fuel_surcharge_payback_basis"::text,
  w."fuel_surcharge",
  w."pilot_charter_incentive",
  w."airframe_program",
  w."maintenance_reserve",
  w."default_cabin_attendant_count",
  w."wifi_annual",
  w."subscriptions_annual",
  w."cleaning_annual",
  w."supplies_annual",
  w."airport_fees_annual",
  w."id",
  'atlas',
  w."created_at",
  w."updated_at"
FROM "warehouse_aircraft" w
WHERE NOT EXISTS (
  SELECT 1 FROM "aircraft_types" t
  WHERE t."display_name" = w."display_name"
     OR (w."model_code" IS NOT NULL AND t."code" = w."model_code")
);

-- Overlay warehouse commercial fields onto existing types matched by code/display name
UPDATE "aircraft_types" t
SET
  "status" = COALESCE(w."status"::text::"AircraftTypeStatus", t."status"),
  "proforma_field_visibility" = COALESCE(w."proforma_field_visibility", t."proforma_field_visibility"),
  "manufacturer" = COALESCE(t."manufacturer", w."manufacturer"),
  "model" = COALESCE(t."model", w."model"),
  "model_code" = COALESCE(t."model_code", w."model_code"),
  "aircraft_category" = COALESCE(t."aircraft_category", w."aircraft_category"::text),
  "passenger_capacity" = COALESCE(t."passenger_capacity", w."passenger_capacity"),
  "max_passengers" = COALESCE(t."max_passengers", w."passenger_capacity"),
  "empty_range" = COALESCE(w."empty_range", t."empty_range"),
  "range_at_max_passengers" = COALESCE(w."range_at_max_passengers", t."range_at_max_passengers"),
  "crew_count" = COALESCE(w."crew_count", t."crew_count"),
  "square_footage" = COALESCE(w."square_footage", t."square_footage"),
  "average_cruise_speed" = COALESCE(w."average_cruise_speed", t."average_cruise_speed"),
  "wifi" = COALESCE(w."wifi", t."wifi"),
  "home_fuel_pct" = COALESCE(w."home_fuel_pct", t."home_fuel_pct"),
  "fuel_gallons_per_hour" = COALESCE(w."fuel_gallons_per_hour", t."fuel_gallons_per_hour"),
  "parts_program" = COALESCE(w."parts_program", t."parts_program"),
  "engine_program" = COALESCE(w."engine_program", t."engine_program"),
  "apu_program" = COALESCE(w."apu_program", t."apu_program"),
  "inspection_reserve" = COALESCE(w."inspection_reserve", t."inspection_reserve"),
  "trip_expense_hourly" = COALESCE(w."trip_expense_hourly", t."trip_expense_hourly"),
  "default_minimum_crew" = COALESCE(w."default_minimum_crew", t."default_minimum_crew"),
  "lead_pilot_salary" = COALESCE(w."lead_pilot_salary", t."lead_pilot_salary"),
  "lead_pilot_training_cost" = COALESCE(w."lead_pilot_training_cost", t."lead_pilot_training_cost"),
  "pic_salary" = COALESCE(w."pic_salary", t."pic_salary"),
  "sic_salary" = COALESCE(w."sic_salary", t."sic_salary"),
  "cabin_attendant_salary" = COALESCE(w."cabin_attendant_salary", t."cabin_attendant_salary"),
  "pic_training_cost" = COALESCE(w."pic_training_cost", t."pic_training_cost"),
  "sic_training_cost" = COALESCE(w."sic_training_cost", t."sic_training_cost"),
  "max_usage_1_pilot" = COALESCE(w."max_usage_1_pilot", t."max_usage_1_pilot"),
  "max_usage_2_pilots" = COALESCE(w."max_usage_2_pilots", t."max_usage_2_pilots"),
  "max_usage_3_pilots" = COALESCE(w."max_usage_3_pilots", t."max_usage_3_pilots"),
  "max_usage_4_pilots" = COALESCE(w."max_usage_4_pilots", t."max_usage_4_pilots"),
  "max_usage_5_pilots" = COALESCE(w."max_usage_5_pilots", t."max_usage_5_pilots"),
  "max_usage_6_pilots" = COALESCE(w."max_usage_6_pilots", t."max_usage_6_pilots"),
  "average_cost" = COALESCE(w."average_cost", t."average_cost"),
  "charter_hourly_rate" = COALESCE(w."charter_hourly_rate", t."charter_hourly_rate"),
  "charter_payback_basis" = COALESCE(w."charter_payback_basis"::text, t."charter_payback_basis"),
  "fuel_surcharge_payback_basis" = COALESCE(w."fuel_surcharge_payback_basis"::text, t."fuel_surcharge_payback_basis"),
  "fuel_surcharge" = COALESCE(w."fuel_surcharge", t."fuel_surcharge"),
  "pilot_charter_incentive" = COALESCE(w."pilot_charter_incentive", t."pilot_charter_incentive"),
  "airframe_program" = COALESCE(w."airframe_program", t."airframe_program"),
  "maintenance_reserve" = COALESCE(w."maintenance_reserve", t."maintenance_reserve"),
  "default_cabin_attendant_count" = COALESCE(w."default_cabin_attendant_count", t."default_cabin_attendant_count"),
  "wifi_annual" = COALESCE(w."wifi_annual", t."wifi_annual"),
  "subscriptions_annual" = COALESCE(w."subscriptions_annual", t."subscriptions_annual"),
  "cleaning_annual" = COALESCE(w."cleaning_annual", t."cleaning_annual"),
  "supplies_annual" = COALESCE(w."supplies_annual", t."supplies_annual"),
  "airport_fees_annual" = COALESCE(w."airport_fees_annual", t."airport_fees_annual"),
  "legacy_warehouse_aircraft_id" = COALESCE(t."legacy_warehouse_aircraft_id", w."id"),
  "updated_at" = NOW()
FROM "warehouse_aircraft" w
WHERE t."legacy_warehouse_aircraft_id" IS NULL
  AND (
    t."display_name" = w."display_name"
    OR (w."model_code" IS NOT NULL AND t."code" = w."model_code")
  );

-- 4) AircraftTail columns
ALTER TABLE "aircraft_tails"
  ADD COLUMN IF NOT EXISTS "basic_empty_weight_lb" INTEGER,
  ADD COLUMN IF NOT EXISTS "mtow_lb" INTEGER,
  ADD COLUMN IF NOT EXISTS "mzfw_lb" INTEGER,
  ADD COLUMN IF NOT EXISTS "max_bag_weight_lb" INTEGER,
  ADD COLUMN IF NOT EXISTS "public_display_type" TEXT,
  ADD COLUMN IF NOT EXISTS "seat_count" INTEGER,
  ADD COLUMN IF NOT EXISTS "luggage_note" TEXT,
  ADD COLUMN IF NOT EXISTS "wifi" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "amenities_json" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "primary_photo_url" TEXT,
  ADD COLUMN IF NOT EXISTS "photo_urls_json" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "is_public_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "empty_leg_hourly_rate_override" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "external_source" TEXT DEFAULT 'atlas',
  ADD COLUMN IF NOT EXISTS "external_id" TEXT,
  ADD COLUMN IF NOT EXISTS "external_synced_at" TIMESTAMP(3);

ALTER TABLE "aircraft_tails" ALTER COLUMN "operating" SET DEFAULT '{}'::jsonb;

-- Promote weights from operating JSON
UPDATE "aircraft_tails"
SET
  "basic_empty_weight_lb" = COALESCE(
    "basic_empty_weight_lb",
    NULLIF(("operating"->>'basicEmptyWeightLb'), '')::int,
    NULLIF(("operating"->>'basicEmptyWeight'), '')::int
  ),
  "mtow_lb" = COALESCE(
    "mtow_lb",
    NULLIF(("operating"->>'mtowLb'), '')::int,
    NULLIF(("operating"->>'maxTakeoffWeight'), '')::int
  ),
  "mzfw_lb" = COALESCE(
    "mzfw_lb",
    NULLIF(("operating"->>'mzfwLb'), '')::int,
    NULLIF(("operating"->>'maxZeroFuelWeight'), '')::int
  ),
  "max_bag_weight_lb" = COALESCE(
    "max_bag_weight_lb",
    NULLIF(("operating"->>'maxBagWeightLb'), '')::int,
    NULLIF(("operating"->>'maxBagWeight'), '')::int
  ),
  "seat_count" = COALESCE(
    "seat_count",
    NULLIF(("operating"->>'seatCount'), '')::int
  );

-- Fold empty-leg fleet configs onto tails
UPDATE "aircraft_tails" t
SET
  "public_display_type" = COALESCE(t."public_display_type", c."public_display_type"),
  "seat_count" = COALESCE(c."seat_count", t."seat_count"),
  "luggage_note" = COALESCE(c."luggage_note", t."luggage_note"),
  "wifi" = COALESCE(c."wifi", t."wifi"),
  "amenities_json" = COALESCE(c."amenities_json", t."amenities_json"),
  "description" = COALESCE(c."description", t."description"),
  "primary_photo_url" = COALESCE(c."primary_photo_url", t."primary_photo_url"),
  "photo_urls_json" = COALESCE(c."photo_urls_json", t."photo_urls_json"),
  "is_public_active" = COALESCE(c."is_active", t."is_public_active"),
  "empty_leg_hourly_rate_override" = COALESCE(
    t."empty_leg_hourly_rate_override",
    CASE
      WHEN p."id" IS NOT NULL AND (
        SELECT COUNT(*) FROM "empty_leg_fleet_tail_configs" x WHERE x."aircraft_profile_id" = p."id"
      ) = 1 THEN p."default_hourly_rate"
      ELSE NULL
    END
  ),
  "updated_at" = NOW()
FROM "empty_leg_fleet_tail_configs" c
LEFT JOIN "empty_leg_aircraft_profiles" p ON p."id" = c."aircraft_profile_id"
WHERE UPPER(t."tail_number") = UPPER(c."tail_number");

-- Apply type-level empty-leg rates from profiles linked by multiple tails sharing a profile name match on type
UPDATE "aircraft_types" typ
SET
  "empty_leg_hourly_rate" = COALESCE(typ."empty_leg_hourly_rate", p."default_hourly_rate"),
  "empty_leg_minimum_hours" = COALESCE(typ."empty_leg_minimum_hours", p."minimum_quotable_time_fallback"),
  "empty_leg_off_routing_hours" = COALESCE(typ."empty_leg_off_routing_hours", p."off_routing_time_allowance_hours")
FROM "aircraft_tails" t
JOIN "empty_leg_fleet_tail_configs" c ON UPPER(c."tail_number") = UPPER(t."tail_number")
JOIN "empty_leg_aircraft_profiles" p ON p."id" = c."aircraft_profile_id"
WHERE t."aircraft_type_id" = typ."id";

-- Create missing tails from empty-leg fleet configs (orphan marketing rows)
INSERT INTO "aircraft_tails" (
  "id", "tail_number", "aircraft_type_id", "status", "operating",
  "public_display_type", "seat_count", "luggage_note", "wifi", "amenities_json",
  "description", "primary_photo_url", "photo_urls_json", "is_public_active",
  "empty_leg_hourly_rate_override", "external_source", "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  c."tail_number",
  COALESCE(
    (SELECT t."id" FROM "aircraft_types" t WHERE t."display_name" = c."aircraft_type" LIMIT 1),
    (SELECT t."id" FROM "aircraft_types" t WHERE t."code" = c."aircraft_type" LIMIT 1),
    (SELECT t."id" FROM "aircraft_types" t ORDER BY t."created_at" LIMIT 1)
  ),
  'active',
  '{}'::jsonb,
  c."public_display_type",
  c."seat_count",
  c."luggage_note",
  c."wifi",
  c."amenities_json",
  c."description",
  c."primary_photo_url",
  c."photo_urls_json",
  c."is_active",
  p."default_hourly_rate",
  'atlas',
  c."created_at",
  c."updated_at"
FROM "empty_leg_fleet_tail_configs" c
LEFT JOIN "empty_leg_aircraft_profiles" p ON p."id" = c."aircraft_profile_id"
WHERE NOT EXISTS (
  SELECT 1 FROM "aircraft_tails" t WHERE UPPER(t."tail_number") = UPPER(c."tail_number")
)
AND EXISTS (SELECT 1 FROM "aircraft_types" LIMIT 1);

-- 5) Point hangar overrides at aircraft_types
ALTER TABLE "fbo_hangar_overrides" ADD COLUMN IF NOT EXISTS "aircraft_type_id" UUID;

UPDATE "fbo_hangar_overrides" o
SET "aircraft_type_id" = t."id"
FROM "aircraft_types" t
WHERE t."legacy_warehouse_aircraft_id" = o."warehouse_aircraft_id"
  AND o."aircraft_type_id" IS NULL;

-- Drop old FK/unique, enforce new
ALTER TABLE "fbo_hangar_overrides" DROP CONSTRAINT IF EXISTS "fbo_hangar_overrides_warehouse_aircraft_id_fkey";
ALTER TABLE "fbo_hangar_overrides" DROP CONSTRAINT IF EXISTS "fbo_hangar_overrides_fbo_id_warehouse_aircraft_id_key";
ALTER TABLE "fbo_hangar_overrides" DROP COLUMN IF EXISTS "warehouse_aircraft_id";
ALTER TABLE "fbo_hangar_overrides" ALTER COLUMN "aircraft_type_id" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "fbo_hangar_overrides_fbo_id_aircraft_type_id_key"
  ON "fbo_hangar_overrides"("fbo_id", "aircraft_type_id");
ALTER TABLE "fbo_hangar_overrides"
  ADD CONSTRAINT "fbo_hangar_overrides_aircraft_type_id_fkey"
  FOREIGN KEY ("aircraft_type_id") REFERENCES "aircraft_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6) Aircraft instances → type/tail
ALTER TABLE "aircraft_instances" ADD COLUMN IF NOT EXISTS "aircraft_type_id" UUID;
ALTER TABLE "aircraft_instances" ADD COLUMN IF NOT EXISTS "aircraft_tail_id" UUID;

UPDATE "aircraft_instances" i
SET "aircraft_type_id" = t."id"
FROM "aircraft_types" t
WHERE t."legacy_warehouse_aircraft_id" = i."warehouse_aircraft_id"
  AND i."aircraft_type_id" IS NULL;

UPDATE "aircraft_instances" i
SET "aircraft_tail_id" = t."id"
FROM "aircraft_tails" t
WHERE i."tail_number" IS NOT NULL
  AND UPPER(t."tail_number") = UPPER(i."tail_number")
  AND i."aircraft_tail_id" IS NULL;

ALTER TABLE "aircraft_instances"
  DROP CONSTRAINT IF EXISTS "aircraft_instances_warehouse_aircraft_id_fkey";

ALTER TABLE "aircraft_instances"
  ADD CONSTRAINT "aircraft_instances_aircraft_type_id_fkey"
  FOREIGN KEY ("aircraft_type_id") REFERENCES "aircraft_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "aircraft_instances"
  ADD CONSTRAINT "aircraft_instances_aircraft_tail_id_fkey"
  FOREIGN KEY ("aircraft_tail_id") REFERENCES "aircraft_tails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 7) Empty legs → tail FK
ALTER TABLE "empty_legs" ADD COLUMN IF NOT EXISTS "aircraft_tail_id" UUID;

UPDATE "empty_legs" e
SET "aircraft_tail_id" = t."id"
FROM "aircraft_tails" t
WHERE UPPER(t."tail_number") = UPPER(e."tail_number")
  AND e."aircraft_tail_id" IS NULL;

CREATE INDEX IF NOT EXISTS "empty_legs_aircraft_tail_id_idx" ON "empty_legs"("aircraft_tail_id");
ALTER TABLE "empty_legs"
  ADD CONSTRAINT "empty_legs_aircraft_tail_id_fkey"
  FOREIGN KEY ("aircraft_tail_id") REFERENCES "aircraft_tails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 8) Retarget schedule/charter FKs (same UUID space after rename)
ALTER TABLE "schedule_events" DROP CONSTRAINT IF EXISTS "schedule_events_fleet_aircraft_id_fkey";
ALTER TABLE "schedule_events"
  ADD CONSTRAINT "schedule_events_fleet_aircraft_id_fkey"
  FOREIGN KEY ("fleet_aircraft_id") REFERENCES "aircraft_tails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "charter_request_matches" DROP CONSTRAINT IF EXISTS "charter_request_matches_fleet_aircraft_id_fkey";
ALTER TABLE "charter_request_matches"
  ADD CONSTRAINT "charter_request_matches_fleet_aircraft_id_fkey"
  FOREIGN KEY ("fleet_aircraft_id") REFERENCES "aircraft_tails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- performance grid FK retarget
ALTER TABLE "aircraft_performance_grids" DROP CONSTRAINT IF EXISTS "crew_performance_grids_aircraft_type_id_fkey";
ALTER TABLE "aircraft_performance_grids" DROP CONSTRAINT IF EXISTS "aircraft_performance_grids_aircraft_type_id_fkey";
ALTER TABLE "aircraft_performance_grids"
  ADD CONSTRAINT "aircraft_performance_grids_aircraft_type_id_fkey"
  FOREIGN KEY ("aircraft_type_id") REFERENCES "aircraft_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "aircraft_tails" DROP CONSTRAINT IF EXISTS "crew_fleet_aircraft_aircraft_type_id_fkey";
ALTER TABLE "aircraft_tails" DROP CONSTRAINT IF EXISTS "aircraft_tails_aircraft_type_id_fkey";
ALTER TABLE "aircraft_tails"
  ADD CONSTRAINT "aircraft_tails_aircraft_type_id_fkey"
  FOREIGN KEY ("aircraft_type_id") REFERENCES "aircraft_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 9) Drop deprecated parallel catalogs
DROP TABLE IF EXISTS "empty_leg_fleet_tail_configs";
DROP TABLE IF EXISTS "empty_leg_aircraft_profiles";
DROP TABLE IF EXISTS "warehouse_aircraft";
