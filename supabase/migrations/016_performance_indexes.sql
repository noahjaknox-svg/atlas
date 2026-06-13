-- Performance indexes for pipeline and proposal workspace queries

CREATE INDEX IF NOT EXISTS idx_proposals_active_updated
  ON proposals (updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_aircraft_instances_proposal_id
  ON aircraft_instances (proposal_id);
