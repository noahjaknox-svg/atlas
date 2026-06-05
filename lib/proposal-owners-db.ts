import { prisma } from "@/lib/db";
import type { PrismaClient } from "@prisma/client";

function ownerProfilesDelegate(): PrismaClient["proposalOwnerProfile"] | null {
  const delegate = (prisma as PrismaClient).proposalOwnerProfile;
  return delegate ?? null;
}
import { aircraftAssumptionCategory } from "@/lib/aircraft-workspace";
import type { ProposalOwnerProfile } from "@/lib/proposal-owners";
import { profileFromLegacyAssumptions } from "@/lib/proposal-owners";
import type { AssumptionMap } from "@/lib/assumptions";
import { OWNER_EXPENSE_ALLOCATION_KEY, parseAllocationMode } from "@/lib/owner-expense-allocation";

export function dbRowToProfile(row: {
  id: string;
  sortOrder: number;
  displayName: string;
  annualFlightHours: { toString(): string };
  ownershipPercent: { toString(): string };
}): ProposalOwnerProfile {
  return {
    id: row.id,
    sortOrder: row.sortOrder,
    displayName: row.displayName,
    annualFlightHours: parseFloat(row.annualFlightHours.toString()) || 0,
    ownershipPercent: parseFloat(row.ownershipPercent.toString()) || 0,
  };
}

export async function loadOwnerProfilesForAircraft(
  proposalId: string,
  aircraftInstanceId: string,
  assumptions: AssumptionMap
): Promise<{
  profiles: ProposalOwnerProfile[];
  allocationMode: ReturnType<typeof parseAllocationMode>;
}> {
  const owners = ownerProfilesDelegate();
  const rows = owners
    ? await owners.findMany({
        where: { proposalId, aircraftInstanceId },
        orderBy: { sortOrder: "asc" },
      })
    : [];

  const profiles =
    rows.length > 0
      ? rows.map(dbRowToProfile)
      : profileFromLegacyAssumptions(assumptions);

  const modeRow = await prisma.proposalAssumption.findUnique({
    where: {
      proposalId_category_assumptionName: {
        proposalId,
        category: aircraftAssumptionCategory(aircraftInstanceId),
        assumptionName: OWNER_EXPENSE_ALLOCATION_KEY,
      },
    },
  });

  const allocationMode = parseAllocationMode(
    modeRow?.value ?? assumptions[OWNER_EXPENSE_ALLOCATION_KEY]
  );

  return { profiles, allocationMode };
}

export async function loadAllOwnersForProposal(
  proposalId: string
): Promise<Record<string, ProposalOwnerProfile[]>> {
  const owners = ownerProfilesDelegate();
  const rows = owners
    ? await owners.findMany({
        where: { proposalId },
        orderBy: [{ aircraftInstanceId: "asc" }, { sortOrder: "asc" }],
      })
    : [];
  const byAircraft: Record<string, ProposalOwnerProfile[]> = {};
  for (const row of rows) {
    const list = byAircraft[row.aircraftInstanceId] ?? [];
    list.push(dbRowToProfile(row));
    byAircraft[row.aircraftInstanceId] = list;
  }
  return byAircraft;
}
