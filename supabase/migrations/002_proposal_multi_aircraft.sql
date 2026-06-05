-- Multi-aircraft proposal workspace
ALTER TABLE aircraft_instances
  ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE;

ALTER TABLE proposal_scenarios
  ADD COLUMN IF NOT EXISTS aircraft_instance_id UUID REFERENCES aircraft_instances(id) ON DELETE CASCADE;

-- Backfill proposal_id from primary aircraft link
UPDATE aircraft_instances ai
SET proposal_id = p.id
FROM proposals p
WHERE p.aircraft_instance_id = ai.id
  AND ai.proposal_id IS NULL;
