import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { perfTimed } from "@/lib/perf-log";
import type { AssumptionMap } from "@/lib/assumptions";
import { assumptionsToMap } from "@/lib/assumptions";
import { syncUtilizationHours } from "@/lib/proforma-utilization";
import { computeWorkspaceProFormaForClient } from "@/lib/workspace-proforma-client";

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

    const result = await perfTimed("calculate.proForma", async () => {
      let map: AssumptionMap;
      if (clientAssumptions) {
        map = syncUtilizationHours(clientAssumptions);
      } else {
        const assumptions = await prisma.proposalAssumption.findMany({
          where: { proposalId: id },
        });

        map = assumptionsToMap(assumptions);
        if (targetAircraftId) {
          const { mergeAssumptionRowsForInstance } = await import(
            "@/lib/proposal-assumption-load"
          );
          const { resolveEffectiveAssumptionsForInstance } = await import(
            "@/lib/resolve-aircraft-defaults"
          );
          map = mergeAssumptionRowsForInstance(
            assumptions.map((a) => ({
              category: a.category,
              assumptionName: a.assumptionName,
              value: a.value,
            })),
            targetAircraftId
          );
          map = await resolveEffectiveAssumptionsForInstance(targetAircraftId, map);
        }
        map = syncUtilizationHours(map);
      }

      const calc = computeWorkspaceProFormaForClient(map);
      const { proForma, metrics } = calc;
      const totalFixedCosts =
        calc.summaryRows.find((row) => row.key === "fixed")?.annual ??
        calc.fixedCostBreakdown.reduce((sum, item) => sum + item.annual, 0);

      await prisma.proposalScenario.updateMany({
        where: {
          proposalId: id,
          ...(targetAircraftId
            ? { aircraftInstanceId: targetAircraftId }
            : { isBaseCase: true }),
        },
        data: {
          aircraftValue: metrics.aircraftValue || null,
          ownerHours: metrics.ownerHours || null,
          charterBlockHours: parseFloat(map.charter_block_hours ?? "") || null,
          charterFlightHours: parseFloat(map.charter_flight_hours ?? "") || null,
          totalFixedCosts: totalFixedCosts || null,
          ownerVariableCosts: proForma.ownerVariableCost,
          charterVariableCosts: proForma.charterVariableCost,
          totalRevenue: proForma.totalRevenue,
          netAnnualCost: proForma.netAnnualCost,
          netMonthlyCost: proForma.netMonthlyCost,
          costPerOwnerHour: proForma.costPerOwnerHour,
        },
      });

      return proForma;
    });

    return jsonOk(result);
  } catch (e) {
    return handleApiError(e);
  }
}
