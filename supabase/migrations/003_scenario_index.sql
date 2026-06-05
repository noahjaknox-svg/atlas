-- V1.1: scenario_index + unique (proposal_id, aircraft_instance_id, scenario_index)
-- Safe for existing data: backfill indices and remove duplicate rows before unique constraint.

ALTER TABLE proposal_scenarios ADD COLUMN IF NOT EXISTS scenario_index INTEGER NOT NULL DEFAULT 1;

-- Named scenarios from app
UPDATE proposal_scenarios SET scenario_index = 0 WHERE scenario_name = 'Scenario A';
UPDATE proposal_scenarios SET scenario_index = 1
  WHERE scenario_name = 'Scenario B (Base)' OR is_base_case = true;
UPDATE proposal_scenarios SET scenario_index = 2 WHERE scenario_name = 'Scenario C';

-- Legacy rows still at default 1: assign 0/1/2 by row order per aircraft (keep up to 3)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY proposal_id, aircraft_instance_id
      ORDER BY is_base_case DESC NULLS LAST, created_at ASC
    ) AS rn
  FROM proposal_scenarios
  WHERE aircraft_instance_id IS NOT NULL
    AND scenario_index = 1
    AND scenario_name NOT IN ('Scenario A', 'Scenario B (Base)', 'Scenario C')
)
UPDATE proposal_scenarios ps
SET scenario_index = CASE ranked.rn
  WHEN 1 THEN 1
  WHEN 2 THEN 0
  WHEN 3 THEN 2
  ELSE ranked.rn - 1
END
FROM ranked
WHERE ps.id = ranked.id AND ranked.rn <= 3;

-- Drop extras beyond three scenarios per proposal + aircraft
DELETE FROM proposal_scenarios
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY proposal_id, aircraft_instance_id
        ORDER BY is_base_case DESC NULLS LAST, created_at ASC
      ) AS rn
    FROM proposal_scenarios
    WHERE aircraft_instance_id IS NOT NULL
  ) sub
  WHERE rn > 3
);

-- Drop duplicate (proposal_id, aircraft_instance_id, scenario_index) keeping oldest row
DELETE FROM proposal_scenarios a
USING proposal_scenarios b
WHERE a.id > b.id
  AND a.proposal_id = b.proposal_id
  AND a.aircraft_instance_id IS NOT DISTINCT FROM b.aircraft_instance_id
  AND a.scenario_index = b.scenario_index
  AND a.aircraft_instance_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS proposal_scenarios_proposal_aircraft_index_key
  ON proposal_scenarios (proposal_id, aircraft_instance_id, scenario_index)
  WHERE aircraft_instance_id IS NOT NULL;
