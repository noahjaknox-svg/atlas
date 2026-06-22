import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { aircraftAssumptionCategory } from "@/lib/aircraft-workspace";
import { mergeLegacyAssumptions } from "@/lib/aircraft-workspace";
import {
  serializeProfilesForApi,
  assumptionsAfterOwnerDefaultsChange,
  validateOwnerProfiles,
  validateProformaOwnerHours,
  OWNER_PROFORMA_HOURS_KEY,
  type ProposalOwnerProfile,
} from "@/lib/proposal-owners";
import { resolveAircraftDefaults } from "@/lib/resolve-aircraft-defaults";
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
    const warehouseDefaults = await resolveAircraftDefaults({
      aircraftInstanceId: aircraftId,
      assumptions,
    });
    const mergedForCrew = assumptionsAfterOwnerDefaultsChange(
      assumptions,
      rawProfiles,
      allocationMode,
      warehouseDefaults
    );
    const max = parseFloat(mergedForCrew.max_annual_utilization ?? "0") || 0;
    const profileValidation = validateOwnerProfiles(
      rawProfiles,
      0,
      rawProfiles.length > 1
    );
    const proformaValidation = validateProformaOwnerHours(
      rawProfiles,
      mergedForCrew,
      max
    );
    if (!profileValidation.ok) {
      return jsonError(profileValidation.messages.join("; "), 400);
    }
    if (!proformaValidation.ok) {
      return jsonError(proformaValidation.messages.join("; "), 400);
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
    const synced = mergedForCrew;

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
    if (synced[OWNER_PROFORMA_HOURS_KEY] !== undefined) {
      await upsertAssumption(
        proposalId,
        category,
        OWNER_PROFORMA_HOURS_KEY,
        synced[OWNER_PROFORMA_HOURS_KEY]
      );
    }
    await upsertAssumption(
      proposalId,
      category,
      "crew_step_index",
      synced.crew_step_index ?? "0"
    );
    await upsertAssumption(
      proposalId,
      category,
      "max_annual_utilization",
      synced.max_annual_utilization ?? "0"
    );
    await upsertAssumption(
      proposalId,
      category,
      "pic_count",
      synced.pic_count ?? "1"
    );
    await upsertAssumption(
      proposalId,
      category,
      "sic_count",
      synced.sic_count ?? "1"
    );
    if (synced.lead_pilot_enabled !== undefined) {
      await upsertAssumption(
        proposalId,
        category,
        "lead_pilot_enabled",
        synced.lead_pilot_enabled
      );
    }
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
        [OWNER_PROFORMA_HOURS_KEY]: synced[OWNER_PROFORMA_HOURS_KEY],
        crew_step_index: synced.crew_step_index,
        max_annual_utilization: synced.max_annual_utilization,
        pic_count: synced.pic_count,
        sic_count: synced.sic_count,
        lead_pilot_enabled: synced.lead_pilot_enabled,
        charter_flight_hours: synced.charter_flight_hours,
        charter_block_hours: synced.charter_block_hours,
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
