-- Staff overrides for departure-airport local time when automatic resolution fails
CREATE TABLE IF NOT EXISTS "airport_timezone_overrides" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "icao" TEXT NOT NULL,
    "iana_timezone" TEXT NOT NULL,
    "note" TEXT,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "airport_timezone_overrides_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "airport_timezone_overrides_icao_key" ON "airport_timezone_overrides"("icao");

ALTER TABLE "airport_timezone_overrides"
  DROP CONSTRAINT IF EXISTS "airport_timezone_overrides_updated_by_id_fkey";
ALTER TABLE "airport_timezone_overrides"
  ADD CONSTRAINT "airport_timezone_overrides_updated_by_id_fkey"
  FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
