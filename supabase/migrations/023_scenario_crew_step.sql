-- Crew step per scenario (A/B/C) and optional lead pilot flag
ALTER TABLE proposal_scenarios
  ADD COLUMN IF NOT EXISTS crew_step_index INTEGER,
  ADD COLUMN IF NOT EXISTS lead_pilot_enabled BOOLEAN;
