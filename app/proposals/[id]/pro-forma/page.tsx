import { notFound } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadProposalAircraft } from "@/lib/load-proposal-aircraft";
import {
  aircraftAssumptionCategory,
  getAircraftDisplayName,
  mergeLegacyAssumptions,
  assumptionsFromInstance,
} from "@/lib/aircraft-workspace";
import { InternalShell } from "@/components/internal/internal-shell";
import { ProFormaView } from "@/components/internal/pro-forma-view";

export default async function ProFormaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aircraft?: string }>;
}) {
  const { id } = await params;
  const { aircraft: aircraftParam } = await searchParams;
  const user = await getInternalUser();

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    select: {
      id: true,
      proposalName: true,
      prospectId: true,
      aircraftInstanceId: true,
      assumptions: {
        select: { category: true, assumptionName: true, value: true },
      },
    },
  });
  if (!proposal) notFound();

  const aircraftList = await loadProposalAircraft(
    proposal.id,
    proposal.prospectId,
    proposal.aircraftInstanceId
  );
  const selected =
    aircraftList.find((a) => a.id === aircraftParam) ?? aircraftList[0] ?? null;
  if (!selected) notFound();

  const category = aircraftAssumptionCategory(selected.id);
  const assumptionMap = mergeLegacyAssumptions(
    proposal.assumptions.map((a) => ({
      category: a.category,
      assumptionName: a.assumptionName,
      value: a.value,
    })),
    category
  );
  const meta = {
    id: selected.id,
    year: selected.year,
    tailNumber: selected.tailNumber,
    serialNumber: selected.serialNumber,
    proposedHomeBaseIcao: selected.proposedHomeBaseIcao,
    estimatedValue: selected.estimatedValue?.toString() ?? null,
    valueSource: selected.valueSource,
    aircraftMaster: selected.aircraftMaster
      ? {
          manufacturer: selected.aircraftMaster.manufacturer,
          model: selected.aircraftMaster.model,
        }
      : null,
  };
  const label = getAircraftDisplayName(
    { ...assumptionsFromInstance(meta), ...assumptionMap },
    meta
  );

  return (
    <InternalShell userName={user?.name} isAdmin={user?.role === "admin"} workspace>
      <ProFormaView
        proposalId={proposal.id}
        aircraftInstanceId={selected.id}
        aircraftLabel={label}
      />
    </InternalShell>
  );
}
