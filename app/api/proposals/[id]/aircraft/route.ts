import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { aircraftAssumptionCategory, usageTypeToOperatingModel } from "@/lib/aircraft-workspace";
import { mergeAssumptionRowsForInstance } from "@/lib/proposal-assumption-load";
import {
  PROFORMA_VISIBILITY_KEY,
  serializeProFormaVisibility,
} from "@/lib/proforma-line-visibility";
import { validateAddAircraftBody } from "@/lib/validate-add-aircraft";
import { applyUsageTypeVisibility } from "@/lib/usage-type-page-visibility";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInternalUser();
    const { id: proposalId } = await params;

    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { prospectId: true, aircraftInstanceId: true },
    });
    if (!proposal) throw new Error("NOT_FOUND");

    const aircraft = await prisma.aircraftInstance.findMany({
      where: {
        prospectId: proposal.prospectId,
        OR: [
          { proposalId },
          ...(proposal.aircraftInstanceId
            ? [{ id: proposal.aircraftInstanceId }]
            : []),
        ],
      },
      include: { aircraftType: true },
      orderBy: { createdAt: "asc" },
    });

    const assumptions = await prisma.proposalAssumption.findMany({
      where: { proposalId },
    });

    const assumptionRows = assumptions.map((a) => ({
      category: a.category,
      assumptionName: a.assumptionName,
      value: a.value,
    }));

    const items = aircraft.map((ac) => {
      let assumptionMap = mergeAssumptionRowsForInstance(assumptionRows, ac.id);
      if (
        proposal.aircraftInstanceId === ac.id &&
        Object.keys(assumptionMap).length === 0
      ) {
        assumptionMap = mergeAssumptionRowsForInstance(assumptionRows, null);
      }
      return {
        id: ac.id,
        year: ac.year,
        tailNumber: ac.tailNumber,
        serialNumber: ac.serialNumber,
        proposedHomeBaseIcao: ac.proposedHomeBaseIcao,
        estimatedValue: ac.estimatedValue,
        valueSource: ac.valueSource,
        aircraftMaster: ac.aircraftType,
        assumptions: assumptionMap,
      };
    });

    return jsonOk({
      selectedAircraftId: proposal.aircraftInstanceId,
      aircraft: items,
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInternalUser();
    const { id: proposalId } = await params;
    const body = await request.json().catch(() => ({}));
    const validated = await validateAddAircraftBody(body as Record<string, unknown>);
    if (!validated.ok) {
      return jsonError(validated.error, 400);
    }
    const input = validated.data;

    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { prospectId: true, aircraftInstanceId: true },
    });
    if (!proposal) throw new Error("NOT_FOUND");

    const homeBase = input.proposedHomeBase;
    const usageType = input.usageType;
    const operatingModel = usageTypeToOperatingModel(usageType);

    const aircraft = await prisma.aircraftInstance.create({
      data: {
        prospectId: proposal.prospectId,
        proposalId,
        proposedHomeBaseIcao: homeBase,
        fboName: input.fboName,
        aircraftTypeId: input.aircraftMasterId,
      },
      include: { aircraftType: true },
    });

    const acCategory = aircraftAssumptionCategory(aircraft.id);
    const initialAssumptions: Record<string, string> = {
      aircraft_profile_mode: "general",
      aircraft_model: input.aircraftModel,
      aircraft_manufacturer: input.manufacturer,
      aircraft_master_id: input.aircraftMasterId,
      proposed_home_base: homeBase,
      home_airport_icao: homeBase,
      fbo_name: input.fboName,
      usage_type: usageType,
      operating_model: operatingModel,
      [PROFORMA_VISIBILITY_KEY]: serializeProFormaVisibility({
        insurance_pl: false,
        registration_pl: false,
      }),
    };

    let seededAssumptions: Record<string, string>;
    try {
      const { seedAircraftWarehouseAssumptions } = await import(
        "@/lib/seed-aircraft-warehouse-assumptions"
      );
      seededAssumptions = await seedAircraftWarehouseAssumptions({
        proposalId,
        category: acCategory,
        aircraftInstanceId: aircraft.id,
        initialAssumptions,
        mode: "seed",
      });
    } catch (seedError) {
      await prisma.aircraftInstance.delete({ where: { id: aircraft.id } }).catch(() => {});
      throw seedError;
    }

    const refreshed = await prisma.aircraftInstance.findUnique({
      where: { id: aircraft.id },
      include: { aircraftType: true },
    });

    const { ensureThreeScenarios } = await import("@/lib/scenarios");
    await ensureThreeScenarios(proposalId, aircraft.id);

    if (!proposal.aircraftInstanceId) {
      await prisma.proposal.update({
        where: { id: proposalId },
        data: { aircraftInstanceId: aircraft.id },
      });
    }

    await applyUsageTypeVisibility(proposalId, usageType);

    return jsonOk({ aircraft: refreshed ?? aircraft, assumptions: seededAssumptions }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
