-- Percent of fuel purchased at home base, per warehouse aircraft.
ALTER TABLE warehouse_aircraft
  ADD COLUMN IF NOT EXISTS home_fuel_pct integer;

UPDATE warehouse_aircraft
SET home_fuel_pct = 70
WHERE home_fuel_pct IS NULL;
