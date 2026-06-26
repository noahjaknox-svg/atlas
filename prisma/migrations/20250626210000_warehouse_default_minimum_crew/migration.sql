-- Replace warehouse crew counts with default minimum crew ladder step.
ALTER TABLE "warehouse_aircraft" ADD COLUMN "default_minimum_crew" INTEGER;

UPDATE "warehouse_aircraft"
SET "default_minimum_crew" = 0
WHERE "default_minimum_crew" IS NULL;

ALTER TABLE "warehouse_aircraft" DROP COLUMN IF EXISTS "lead_pilot_count";
ALTER TABLE "warehouse_aircraft" DROP COLUMN IF EXISTS "pic_count";
ALTER TABLE "warehouse_aircraft" DROP COLUMN IF EXISTS "sic_count";
ALTER TABLE "warehouse_aircraft" DROP COLUMN IF EXISTS "cabin_attendant_count";
