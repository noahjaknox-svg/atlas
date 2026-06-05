import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import {
  assumptionsToProFormaInputs,
  calculateProFormaScenarios,
} from "@/lib/proforma";
import { ensureThreeScenarios, scenarioInputsFromDb } from "@/lib/scenarios";
import { aircraftAssumptionCategory, mergeLegacyAssumptions } from "@/lib/aircraft-workspace";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInternalUser();
    const { id } = await params;
    const url = new URL(request.url);
    const aircraftInstanceId = url.searchParams.get("aircraftInstanceId");

    const proposal = await prisma.proposal.findUnique({
      where: { id },
      select: { aircraftInstanceId: true },
    });
    const targetAircraftId = aircraftInstanceId ?? proposal?.aircraftInstanceId;
    if (!targetAircraftId) throw new Error("NO_AIRCRAFT");

    await ensureThreeScenarios(id, targetAircraftId);

    const [assumptions, scenarioRows] = await Promise.all([
      prisma.proposalAssumption.findMany({ where: { proposalId: id } }),
      prisma.proposalScenario.findMany({
        where: { proposalId: id, aircraftInstanceId: targetAircraftId },
        orderBy: { scenarioIndex: "asc" },
      }),
    ]);

    const category = aircraftAssumptionCategory(targetAircraftId);
    const map = mergeLegacyAssumptions(
      assumptions.map((a) => ({
        category: a.category,
        assumptionName: a.assumptionName,
        value: a.value,
      })),
      category
    );

    const baseInputs = assumptionsToProFormaInputs(map);
    const scenarioInputs = scenarioInputsFromDb(scenarioRows);
    const results = calculateProFormaScenarios(baseInputs, scenarioInputs);

    return jsonOk({
      scenarios: results,
      scenarioInputs,
      assumptionsMeta: [
        { label: "Charter Rate (Block)", value: map.charter_rate, source: "Manual entry" },
        { label: "Payback %", value: map.charter_payback_pct, source: "PrismJet standard" },
        { label: "Avg Fuel Cost", value: map.home_fuel_price, source: "Blended" },
        { label: "Fuel Burn", value: map.fuel_burn_gph, source: "Aircraft reference" },
        { label: "PIC Salary", value: map.pic_salary, source: "NBAA benchmark" },
      ],
      breakEvenBase: results.find((r) => r.scenarioIndex === 1)?.breakEvenCharterHours ?? null,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
