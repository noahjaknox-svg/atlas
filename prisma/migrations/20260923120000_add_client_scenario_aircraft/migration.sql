-- AlterTable
ALTER TABLE "client_scenarios" ADD COLUMN     "aircraft_instance_id" UUID;

-- CreateIndex
CREATE INDEX "client_scenarios_proposal_id_aircraft_instance_id_idx" ON "client_scenarios"("proposal_id", "aircraft_instance_id");

