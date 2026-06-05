import { prisma } from "@/lib/db";

/** Load all aircraft for a proposal (works before/after multi-aircraft schema migration). */
export async function loadProposalAircraft(
  proposalId: string,
  prospectId: string,
  primaryAircraftInstanceId: string | null
) {
  const include = { aircraftMaster: true } as const;

  try {
    const byProposal = await prisma.aircraftInstance.findMany({
      where: { proposalId } as { proposalId: string },
      include,
      orderBy: { createdAt: "asc" },
    });
    if (byProposal.length > 0) return byProposal;
  } catch {
    // Prisma client or DB column not ready yet — fall through
  }

  if (primaryAircraftInstanceId) {
    const primary = await prisma.aircraftInstance.findUnique({
      where: { id: primaryAircraftInstanceId },
      include,
    });
    if (primary) return [primary];
  }

  return prisma.aircraftInstance.findMany({
    where: { prospectId },
    include,
    orderBy: { createdAt: "asc" },
    take: 10,
  });
}
