import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { assumptionsToMap } from "@/lib/assumptions";
import { assumptionsToProFormaInputs, calculateProForma } from "@/lib/proforma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInternalUser();
    const { id } = await params;

    const assumptions = await prisma.proposalAssumption.findMany({
      where: { proposalId: id },
    });
    const map = assumptionsToMap(assumptions);
    const result = calculateProForma(assumptionsToProFormaInputs(map));

    const totalFixed =
      parseFloat(map.total_fixed_costs ?? "0") ||
      [
        "crew_total",
        "hangar_annual",
        "management_fee",
        "insurance_annual",
        "crew_training",
      ].reduce((sum, key) => sum + (parseFloat(map[key] ?? "0") || 0), 0);

    await prisma.proposalScenario.updateMany({
      where: { proposalId: id, isBaseCase: true },
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
