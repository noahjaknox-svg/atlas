-- Atlas V1 — Supabase RLS policies and snapshot immutability
-- Run against your Supabase Postgres database after Prisma migrate

-- Enable RLS on internal tables (adjust as needed for your auth model)
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_assumptions ENABLE ROW LEVEL SECURITY;

-- Example: authenticated users can read all proposals (tighten per-org later)
CREATE POLICY "authenticated_read_proposals" ON proposals
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_write_proposals" ON proposals
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Client portal tables: no direct client access via Supabase client
ALTER TABLE client_portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_snapshots ENABLE ROW LEVEL SECURITY;

-- Immutable snapshot guard
CREATE OR REPLACE FUNCTION prevent_snapshot_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'proposal_snapshots are immutable after publish';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS proposal_snapshots_immutable ON proposal_snapshots;
CREATE TRIGGER proposal_snapshots_immutable
  BEFORE UPDATE OR DELETE ON proposal_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION prevent_snapshot_update();
