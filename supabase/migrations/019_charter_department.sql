-- Charter department: trip legs, request metadata, charter user role

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'charter';

CREATE TYPE "CharterTripType" AS ENUM ('one_way', 'round_trip', 'multi_city');

ALTER TABLE "crew_aircraft_types"
  ADD COLUMN IF NOT EXISTS "max_passengers" INTEGER;

ALTER TABLE "charter_requests"
  ADD COLUMN IF NOT EXISTS "created_by_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "trip_type" "CharterTripType" NOT NULL DEFAULT 'one_way',
  ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS "flight_category" TEXT;

CREATE TABLE IF NOT EXISTS "charter_request_legs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "request_id" UUID NOT NULL REFERENCES "charter_requests"("id") ON DELETE CASCADE,
  "leg_index" INTEGER NOT NULL,
  "dep_icao" TEXT NOT NULL,
  "arr_icao" TEXT NOT NULL,
  "depart_at" TIMESTAMPTZ,
  "time_tbd" BOOLEAN NOT NULL DEFAULT false,
  "depart_pref" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "charter_request_legs_request_id_leg_index_idx"
  ON "charter_request_legs" ("request_id", "leg_index");
