import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { assumptionsToMap } from "@/lib/assumptions";
import { aircraftAssumptionCategory, mergeLegacyAssumptions } from "@/lib/aircraft-workspace";
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

    const category = aircraftAssumptionCategory(aircraftId);
    const assumptions = mergeLegacyAssumptions(
      proposal.assumptions.map((a) => ({
        category: a.category,
        assumptionName: a.assumptionName,
        value: a.value,
      })),
      category
    );

    const homeIcao = url.searchParams.get("homeIcao")?.trim();
    const fboName = url.searchParams.get("fboName")?.trim();
    const usageType = url.searchParams.get("usageType")?.trim();
    const warehouseAircraftId = url.searchParams.get("warehouseAircraftId")?.trim();

    if (homeIcao) {
      const code = homeIcao.toUpperCase();
      assumptions.home_airport_icao = code;
      assumptions.proposed_home_base = code;
    }
    if (fboName) assumptions.fbo_name = fboName;
    if (usageType === "part_91_135" || usageType === "part_91") {
      assumptions.usage_type = usageType;
    }
    if (warehouseAircraftId) assumptions.aircraft_master_id = warehouseAircraftId;

    const defaults = await resolveAircraftDefaults({
      aircraftInstanceId: aircraftId,
      assumptions,
    });

    return jsonOk({ defaults });
  } catch (e) {
    return handleApiError(e);
  }
}
