import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import {
  aircraftAssumptionCategory,
  mergeLegacyAssumptions,
} from "@/lib/aircraft-workspace";

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
      include: { aircraftMaster: true },
      orderBy: { createdAt: "asc" },
    });

    const assumptions = await prisma.proposalAssumption.findMany({
      where: { proposalId },
    });

    const items = aircraft.map((ac) => {
      const category = aircraftAssumptionCategory(ac.id);
      const assumptionMap = mergeLegacyAssumptions(
        assumptions.map((a) => ({
          category: a.category,
          assumptionName: a.assumptionName,
          value: a.value,
        })),
        category
      );
      if (
        proposal.aircraftInstanceId === ac.id &&
        Object.keys(assumptionMap).length === 0
      ) {
        const legacy = mergeLegacyAssumptions(
          assumptions.map((a) => ({
            category: a.category,
            assumptionName: a.assumptionName,
            value: a.value,
          })),
          "legacy-none"
        );
        Object.assign(assumptionMap, legacy);
      }
      return {
        id: ac.id,
        year: ac.year,
        tailNumber: ac.tailNumber,
        serialNumber: ac.serialNumber,
        proposedHomeBaseIcao: ac.proposedHomeBaseIcao,
        estimatedValue: ac.estimatedValue,
        valueSource: ac.valueSource,
        aircraftMaster: ac.aircraftMaster,
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

    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { prospectId: true, aircraftInstanceId: true },
    });
    if (!proposal) throw new Error("NOT_FOUND");

    const homeBase =
      body.proposedHomeBase?.trim().toUpperCase() ||
      body.proposedHomeBaseIcao?.trim().toUpperCase() ||
      "SDL";
    const usageType =
      body.usageType === "part_91_135" ? "part_91_135" : "part_91";
    const operatingModel =
      usageType === "part_91_135"
        ? "Part 91 plus Part 135 charter"
        : "Part 91 management only";

    const aircraft = await prisma.aircraftInstance.create({
      data: {
        prospectId: proposal.prospectId,
        proposalId,
        proposedHomeBaseIcao: homeBase,
        fboName: body.fboName?.trim() || "PrismJet",
        aircraftMasterId: body.aircraftMasterId?.trim() || null,
      },
      include: { aircraftMaster: true },
    });

    const acCategory = aircraftAssumptionCategory(aircraft.id);
    const assumptionRows: Array<{ assumptionName: string; value: string }> = [];
    if (body.aircraftModel?.trim()) {
      assumptionRows.push({
        assumptionName: "aircraft_model",
        value: String(body.aircraftModel).trim(),
      });
    }
    if (body.aircraftMasterId) {
      assumptionRows.push({
        assumptionName: "aircraft_master_id",
        value: String(body.aircraftMasterId),
      });
    }
    assumptionRows.push(
      { assumptionName: "proposed_home_base", value: homeBase },
      { assumptionName: "home_airport_icao", value: homeBase },
      { assumptionName: "fbo_name", value: body.fboName?.trim() || "PrismJet" },
      { assumptionName: "usage_type", value: usageType },
      { assumptionName: "operating_model", value: operatingModel }
    );

    for (const row of assumptionRows) {
      await prisma.proposalAssumption.create({
        data: {
          proposalId,
          category: acCategory,
          assumptionName: row.assumptionName,
          value: row.value,
          sourceType: "manual",
        },
      });
    }

    const { ensureThreeScenarios } = await import("@/lib/scenarios");
    await ensureThreeScenarios(proposalId, aircraft.id);

    if (!proposal.aircraftInstanceId) {
      await prisma.proposal.update({
        where: { id: proposalId },
        data: { aircraftInstanceId: aircraft.id },
      });
    }

    return jsonOk({ aircraft }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
