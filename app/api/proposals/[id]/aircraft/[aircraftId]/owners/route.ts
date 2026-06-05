import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { aircraftAssumptionCategory } from "@/lib/aircraft-workspace";
import { mergeLegacyAssumptions } from "@/lib/aircraft-workspace";
import {
  serializeProfilesForApi,
  syncOwnersIntoAssumptions,
  validateOwnerProfiles,
  type ProposalOwnerProfile,
} from "@/lib/proposal-owners";
import { dbRowToProfile, loadOwnerProfilesForAircraft } from "@/lib/proposal-owners-db";
import {
  OWNER_EXPENSE_ALLOCATION_KEY,
  parseAllocationMode,
} from "@/lib/owner-expense-allocation";

async function getAssumptionMap(proposalId: string, aircraftId: string) {
  const assumptions = await prisma.proposalAssumption.findMany({
    where: { proposalId },
  });
  const category = aircraftAssumptionCategory(aircraftId);
  const rows = assumptions.map((a) => ({
    category: a.category,
    assumptionName: a.assumptionName,
    value: a.value,
  }));
  let map = mergeLegacyAssumptions(rows, category);
  if (Object.keys(map).length === 0) {
    map = mergeLegacyAssumptions(rows, "__legacy__");
  }
  return map;
}

async function upsertAssumption(
  proposalId: string,
  category: string,
  name: string,
  value: string
) {
  await prisma.proposalAssumption.upsert({
    where: {
      proposalId_category_assumptionName: {
        proposalId,
        category,
        assumptionName: name,
      },
    },
    create: {
      proposalId,
      category,
      assumptionName: name,
      value,
      sourceType: "manual",
    },
    update: { value },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; aircraftId: string }> }
) {
  try {
    await requireInternalUser();
    const { id: proposalId, aircraftId } = await params;

    const aircraft = await prisma.aircraftInstance.findFirst({
      where: { id: aircraftId, proposalId },
    });
    if (!aircraft) throw new Error("NOT_FOUND");

    const assumptions = await getAssumptionMap(proposalId, aircraftId);
    const { profiles, allocationMode } = await loadOwnerProfilesForAircraft(
      proposalId,
      aircraftId,
      assumptions
    );

    return jsonOk({
      profiles: serializeProfilesForApi(profiles),
      allocationMode,
      ownerCount: profiles.length,
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; aircraftId: string }> }
) {
  try {
    await requireInternalUser();
    const { id: proposalId, aircraftId } = await params;
    const body = await request.json();

    const aircraft = await prisma.aircraftInstance.findFirst({
      where: { id: aircraftId, proposalId },
    });
    if (!aircraft) throw new Error("NOT_FOUND");

    const rawProfiles = (body.profiles ?? []) as ProposalOwnerProfile[];
    const allocationMode = parseAllocationMode(body.allocationMode);

    const assumptions = await getAssumptionMap(proposalId, aircraftId);
    const max = parseFloat(assumptions.max_annual_utilization ?? "0") || 0;
    const validation = validateOwnerProfiles(rawProfiles, max, rawProfiles.length > 1);
    if (!validation.ok) {
      return jsonError(validation.messages.join("; "), 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.proposalOwnerProfile.deleteMany({
        where: { proposalId, aircraftInstanceId: aircraftId },
      });

      for (let i = 0; i < rawProfiles.length; i++) {
        const p = rawProfiles[i];
        await tx.proposalOwnerProfile.create({
          data: {
            proposalId,
            aircraftInstanceId: aircraftId,
            sortOrder: i,
            displayName: p.displayName.trim() || `Owner ${i + 1}`,
            annualFlightHours: p.annualFlightHours ?? 0,
            ownershipPercent: p.ownershipPercent ?? (rawProfiles.length === 1 ? 100 : 0),
          },
        });
      }
    });

    const category = aircraftAssumptionCategory(aircraftId);
    const synced = syncOwnersIntoAssumptions(assumptions, rawProfiles, allocationMode);

    await upsertAssumption(
      proposalId,
      category,
      OWNER_EXPENSE_ALLOCATION_KEY,
      allocationMode
    );
    await upsertAssumption(
      proposalId,
      category,
      "owner_annual_hours",
      synced.owner_annual_hours ?? "0"
    );
    if (synced.charter_block_hours !== undefined) {
      await upsertAssumption(
        proposalId,
        category,
        "charter_block_hours",
        synced.charter_block_hours
      );
    }
    if (synced.charter_flight_hours !== undefined) {
      await upsertAssumption(
        proposalId,
        category,
        "charter_flight_hours",
        synced.charter_flight_hours
      );
    }

    const saved = await prisma.proposalOwnerProfile.findMany({
      where: { proposalId, aircraftInstanceId: aircraftId },
      orderBy: { sortOrder: "asc" },
    });

    return jsonOk({
      profiles: saved.map(dbRowToProfile),
      allocationMode,
      syncedAssumptions: {
        owner_annual_hours: synced.owner_annual_hours,
        charter_flight_hours: synced.charter_flight_hours,
        charter_block_hours: synced.charter_block_hours,
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
