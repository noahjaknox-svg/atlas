import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { ensureThreeScenarios, SCENARIO_NAMES } from "@/lib/scenarios";
import { aircraftAssumptionCategory } from "@/lib/aircraft-workspace";
import { mergeAssumptionRowsForInstance } from "@/lib/proposal-assumption-load";
import { resolveEffectiveAssumptionsForInstance } from "@/lib/resolve-aircraft-defaults";
import { scenarioCharterHoursFromCrew } from "@/lib/scenario-crew";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInternalUser();
    const { id } = await params;
    const body = await request.json();
    const aircraftInstanceId = body.aircraftInstanceId as string;
    if (!aircraftInstanceId) throw new Error("VALIDATION");

    await ensureThreeScenarios(id, aircraftInstanceId);

    const assumptionRows = await prisma.proposalAssumption.findMany({
      where: { proposalId: id },
    });
    let baseMap = mergeAssumptionRowsForInstance(
      assumptionRows.map((a) => ({
        category: a.category,
        assumptionName: a.assumptionName,
        value: a.value,
      })),
      aircraftInstanceId
    );
    baseMap = await resolveEffectiveAssumptionsForInstance(aircraftInstanceId, baseMap);

    const category = aircraftAssumptionCategory(aircraftInstanceId);

    const scenarios = body.scenarios as Array<{
      scenarioIndex: number;
      charterBlockHours?: number;
      charterFlightHours?: number;
      ownerFlightHours: number;
      crewStepIndex?: number | null;
      leadPilotEnabled?: boolean | null;
    }>;

    for (const s of scenarios) {
      if (s.scenarioIndex < 0 || s.scenarioIndex > 2) continue;
      const charter = scenarioCharterHoursFromCrew(baseMap, {
        ownerFlightHours: s.ownerFlightHours,
        crewStepIndex: s.crewStepIndex,
        leadPilotEnabled: s.leadPilotEnabled,
      });
      await prisma.proposalScenario.updateMany({
        where: {
          proposalId: id,
          aircraftInstanceId,
          scenarioIndex: s.scenarioIndex,
        },
        data: {
          charterBlockHours: charter.charterBlockHours,
          charterFlightHours: charter.charterFlightHours,
          ownerHours: s.ownerFlightHours,
          crewStepIndex: s.crewStepIndex ?? null,
          leadPilotEnabled: s.leadPilotEnabled ?? null,
        },
      });

      if (s.scenarioIndex === 1) {
        await prisma.proposalAssumption.upsert({
          where: {
            proposalId_category_assumptionName: {
              proposalId: id,
              category,
              assumptionName: "crew_step_index",
            },
          },
          create: {
            proposalId: id,
            category,
            assumptionName: "crew_step_index",
            value: String(s.crewStepIndex ?? 0),
            sourceType: "manual",
          },
          update: {
            value: String(s.crewStepIndex ?? 0),
          },
        });
        await prisma.proposalAssumption.upsert({
          where: {
            proposalId_category_assumptionName: {
              proposalId: id,
              category,
              assumptionName: "lead_pilot_enabled",
            },
          },
          create: {
            proposalId: id,
            category,
            assumptionName: "lead_pilot_enabled",
            value: s.leadPilotEnabled ? "yes" : "no",
            sourceType: "manual",
          },
          update: {
            value: s.leadPilotEnabled ? "yes" : "no",
          },
        });
      }
    }

    return jsonOk({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
