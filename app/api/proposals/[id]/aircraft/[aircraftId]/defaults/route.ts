import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { assumptionsToMap } from "@/lib/assumptions";
import { aircraftAssumptionCategory, mergeLegacyAssumptions } from "@/lib/aircraft-workspace";
import { resolveAircraftDefaults } from "@/lib/resolve-aircraft-defaults";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; aircraftId: string }> }
) {
  try {
    await requireInternalUser();
    const { id, aircraftId } = await params;

    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: { assumptions: true },
    });
    if (!proposal) throw new Error("NOT_FOUND");

    const category = aircraftAssumptionCategory(aircraftId);
    const assumptions = mergeLegacyAssumptions(
      proposal.assumptions.map((a) => ({
        category: a.category,
        assumptionName: a.assumptionName,
        value: a.value,
      })),
      category
    );

    const defaults = await resolveAircraftDefaults({
      aircraftInstanceId: aircraftId,
      assumptions,
    });

    return jsonOk({ defaults });
  } catch (e) {
    return handleApiError(e);
  }
}
