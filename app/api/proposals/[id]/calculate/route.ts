import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { assumptionsToMap } from "@/lib/assumptions";
import type { AssumptionMap } from "@/lib/assumptions";
import {
  assumptionsToProFormaInputs,
  calculateProForma,
  computeTotalFixedFromAssumptions,
} from "@/lib/proforma";
import { syncUtilizationHours } from "@/lib/proforma-utilization";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInternalUser();
    const { id } = await params;
    const url = new URL(request.url);
    const aircraftInstanceId = url.searchParams.get("aircraftInstanceId");

    let clientAssumptions: AssumptionMap | null = null;
    try {
      const body = await request.json();
      if (body?.assumptions && typeof body.assumptions === "object") {
        clientAssumptions = body.assumptions as AssumptionMap;
      }
    } catch {
      // No body — fall back to DB
    }

    const proposal = await prisma.proposal.findUnique({
      where: { id },
      select: { aircraftInstanceId: true },
    });
    const targetAircraftId = aircraftInstanceId ?? proposal?.aircraftInstanceId;

    let map: AssumptionMap;
    if (clientAssumptions) {
      map = syncUtilizationHours(clientAssumptions);
    } else {
      const assumptions = await prisma.proposalAssumption.findMany({
        where: { proposalId: id },
      });

      map = assumptionsToMap(assumptions);
      if (targetAircraftId) {
        const { aircraftAssumptionCategory, mergeLegacyAssumptions } = await import(
          "@/lib/aircraft-workspace"
        );
        const category = aircraftAssumptionCategory(targetAircraftId);
        const perAircraft = mergeLegacyAssumptions(
          assumptions.map((a) => ({
            category: a.category,
            assumptionName: a.assumptionName,
            value: a.value,
          })),
          category
        );
        if (Object.keys(perAircraft).length > 0) map = perAircraft;
      }
      map = syncUtilizationHours(map);
    }

    const result = calculateProForma(assumptionsToProFormaInputs(map));

    const totalFixed =
      parseFloat(map.total_fixed_costs ?? "0") || computeTotalFixedFromAssumptions(map);

    await prisma.proposalScenario.updateMany({
      where: {
        proposalId: id,
        ...(targetAircraftId
          ? { aircraftInstanceId: targetAircraftId }
          : { isBaseCase: true }),
      },
      data: {
        aircraftValue: map.aircraft_value ? parseFloat(map.aircraft_value) : null,
        ownerHours: map.owner_annual_hours ? parseFloat(map.owner_annual_hours) : null,
        charterBlockHours: map.charter_block_hours
          ? parseFloat(map.charter_block_hours)
          : null,
        charterFlightHours: map.charter_flight_hours
          ? parseFloat(map.charter_flight_hours)
          : null,
        totalFixedCosts: totalFixed || null,
        ownerVariableCosts: result.ownerVariableCost,
        charterVariableCosts: result.charterVariableCost,
        totalRevenue: result.totalRevenue,
        netAnnualCost: result.netAnnualCost,
        netMonthlyCost: result.netMonthlyCost,
        costPerOwnerHour: result.costPerOwnerHour,
      },
    });

    return jsonOk(result);
  } catch (e) {
    return handleApiError(e);
  }
}
