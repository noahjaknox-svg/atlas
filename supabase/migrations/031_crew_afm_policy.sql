-- AFM provenance + org policy for Crew sync.

ALTER TABLE "aircraft_types" ADD COLUMN IF NOT EXISTS "afm_notes" TEXT;

ALTER TABLE "aircraft_performance_grids" ADD COLUMN IF NOT EXISTS "source" TEXT;

CREATE TABLE IF NOT EXISTS "crew_org_policy" (
  "id" TEXT NOT NULL,
  "thresholds" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "crew_org_policy_pkey" PRIMARY KEY ("id")
);
