-- Optional type-level Crew PerformanceModel (slope/wind/climb refs)
ALTER TABLE crew_aircraft_types
  ADD COLUMN IF NOT EXISTS performance_model JSONB;

-- Backfill B300 = Crew PerformanceModel.kingAir350
UPDATE crew_aircraft_types
SET
  performance_model = '{
    "takeoffSlopePctPerPct": 0.08,
    "headwindFactorPerKt": 0.008,
    "tailwindFactorPerKt": 0.024,
    "landingSlopePctPerPct": 0.05,
    "landingRefFt": 2940,
    "climbRefLow":  { "altitudeFt": 5000,  "minutes": 3,  "fuelLb": 54,  "nm": 8 },
    "climbRefHigh": { "altitudeFt": 25000, "minutes": 16, "fuelLb": 237, "nm": 52 }
  }'::jsonb,
  updated_at = now()
WHERE code = 'B300'
  AND (performance_model IS NULL OR performance_model = 'null'::jsonb);
