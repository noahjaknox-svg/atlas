-- Align enum-backed columns with schema.prisma.
--
-- Production was built partly from hand-written SQL, and after the crew_* -> aircraft_*
-- table renames some columns kept their old enum types (or plain text):
--   aircraft_tails.status              CrewFleetStatus       -> AircraftTailStatus
--   aircraft_performance_grids.metric  CrewPerformanceMetric -> AircraftPerformanceMetric
--   aircraft_types.aircraft_category   text                  -> AircraftCategory
--   aircraft_types.*_payback_basis     text                  -> PaybackBasis
-- Prisma casts writes to the schema's enum type, and Postgres rejects writing one enum
-- type into a column of another (42804), so creating/editing tails or performance grids
-- fails on production.
--
-- Every step is guarded, so this is a no-op wherever the column already has the right
-- type (e.g. staging, which was built from schema.prisma). All existing production
-- values were verified to be valid labels of the target enums before writing this.

-- Target enum types normally exist already; create them only if missing.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AircraftTailStatus') THEN
    CREATE TYPE "AircraftTailStatus" AS ENUM ('active', 'retired');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AircraftPerformanceMetric') THEN
    CREATE TYPE "AircraftPerformanceMetric" AS ENUM ('takeoffFieldLength', 'landingDistance');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AircraftCategory') THEN
    CREATE TYPE "AircraftCategory" AS ENUM ('light_jet', 'midsize_jet', 'super_midsize_jet',
      'large_cabin_jet', 'ultra_long_range_jet', 'turboprop', 'piston', 'helicopter', 'other');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaybackBasis') THEN
    CREATE TYPE "PaybackBasis" AS ENUM ('block_time', 'flight_time');
  END IF;
END $$;

-- Convert one column to the target type when it doesn't already have it,
-- preserving its default across the type change.
CREATE OR REPLACE FUNCTION pg_temp.atlas_align_column(tbl text, col text, target text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  current_type text;
  col_default text;
BEGIN
  SELECT udt_name, column_default INTO current_type, col_default
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = tbl AND column_name = col;

  IF current_type IS NULL OR current_type = target THEN
    RETURN;
  END IF;

  IF col_default IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT', tbl, col);
  END IF;

  EXECUTE format(
    'ALTER TABLE public.%I ALTER COLUMN %I TYPE %I USING %I::text::%I',
    tbl, col, target, col, target
  );

  IF col_default IS NOT NULL THEN
    -- e.g. 'active'::"CrewFleetStatus" -> 'active'::"AircraftTailStatus"
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT %L::%I',
      tbl, col, split_part(split_part(col_default, '''', 2), '''', 1), target
    );
  END IF;
END $$;

SELECT pg_temp.atlas_align_column('aircraft_tails', 'status', 'AircraftTailStatus');
SELECT pg_temp.atlas_align_column('aircraft_performance_grids', 'metric', 'AircraftPerformanceMetric');
SELECT pg_temp.atlas_align_column('aircraft_types', 'aircraft_category', 'AircraftCategory');
SELECT pg_temp.atlas_align_column('aircraft_types', 'charter_payback_basis', 'PaybackBasis');
SELECT pg_temp.atlas_align_column('aircraft_types', 'fuel_surcharge_payback_basis', 'PaybackBasis');

-- Drop the orphaned legacy enum types once nothing uses them.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CrewFleetStatus')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE udt_name = 'CrewFleetStatus') THEN
    DROP TYPE "CrewFleetStatus";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CrewPerformanceMetric')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE udt_name = 'CrewPerformanceMetric') THEN
    DROP TYPE "CrewPerformanceMetric";
  END IF;
END $$;
