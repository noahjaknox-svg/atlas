-- default_minimum_crew: step index 0 → null (use pilot-count semantics; unset = blank)
UPDATE "warehouse_aircraft"
SET "default_minimum_crew" = NULL
WHERE "default_minimum_crew" = 0;

ALTER TABLE "warehouse_aircraft" ADD COLUMN IF NOT EXISTS "lead_pilot_training_cost" INTEGER;
