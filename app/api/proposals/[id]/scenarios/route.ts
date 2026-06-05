import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { ensureThreeScenarios, SCENARIO_NAMES } from "@/lib/scenarios";

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

    const scenarios = body.scenarios as Array<{
      scenarioIndex: number;
      charterBlockHours: number;
      charterFlightHours: number;
      ownerFlightHours: number;
    }>;

    for (const s of scenarios) {
      if (s.scenarioIndex < 0 || s.scenarioIndex > 2) continue;
      await prisma.proposalScenario.updateMany({
        where: {
          proposalId: id,
          aircraftInstanceId,
          scenarioIndex: s.scenarioIndex,
        },
        data: {
          charterBlockHours: s.charterBlockHours,
          charterFlightHours: s.charterFlightHours,
          ownerHours: s.ownerFlightHours,
        },
      });
    }

    return jsonOk({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
