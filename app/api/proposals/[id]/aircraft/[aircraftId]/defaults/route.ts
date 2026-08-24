import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { assumptionsToMap } from "@/lib/assumptions";
import { mergeAssumptionRowsForInstance } from "@/lib/proposal-assumption-load";
import { resolveAircraftDefaults } from "@/lib/resolve-aircraft-defaults";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; aircraftId: string }> }
) {
  try {
    await requireInternalUser();
    const { id, aircraftId } = await params;
    const url = new URL(request.url);

    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: { assumptions: true },
    });
    if (!proposal) throw new Error("NOT_FOUND");

    const assumptions = mergeAssumptionRowsForInstance(
      proposal.assumptions.map((a) => ({
        category: a.category,
        assumptionName: a.assumptionName,
        value: a.value,
      })),
      aircraftId
    );

    const homeIcao = url.searchParams.get("homeIcao")?.trim();
    const fboName = url.searchParams.get("fboName")?.trim();
    const usageType = url.searchParams.get("usageType")?.trim();
    const aircraftTypeId = url.searchParams.get("aircraftTypeId")?.trim();

    if (homeIcao) {
      const code = homeIcao.toUpperCase();
      assumptions.home_airport_icao = code;
      assumptions.proposed_home_base = code;
    }
    if (fboName) assumptions.fbo_name = fboName;
    if (usageType) assumptions.usage_type = usageType;
    if (aircraftTypeId) assumptions.aircraft_master_id = aircraftTypeId;

    const defaults = await resolveAircraftDefaults({
      aircraftInstanceId: aircraftId,
      assumptions,
    });

    return jsonOk({ defaults });
  } catch (e) {
    return handleApiError(e);
  }
}
