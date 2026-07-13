import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { calculateEmptyLegPrice } from "@/lib/charter/empty-legs/pricing";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; placementId: string }> }
) {
  try {
    await requireDepartmentAccess("charter");
    const { id, placementId } = await params;

    const placement = await prisma.emptyLegPlacement.findFirst({
      where: { id: placementId, emptyLegId: id },
      include: {
        emptyLeg: true,
        publicList: true,
      },
    });
    if (!placement) return jsonError("Placement not found", 404);

    const settings = await prisma.emptyLegSettings.findUnique({ where: { id: "default" } });
    const fleet = await prisma.emptyLegFleetTailConfig.findUnique({
      where: { tailNumber: placement.emptyLeg.tailNumber },
    });
    const profile = fleet?.aircraftProfileId
      ? await prisma.emptyLegAircraftProfile.findUnique({
          where: { id: fleet.aircraftProfileId },
        })
      : null;

    const [listProfiles, globalProfiles] = await Promise.all([
      prisma.emptyLegRoutingProfile.findMany({
        where: {
          isActive: true,
          scope: "public_list",
          publicListId: placement.publicListId,
        },
      }),
      prisma.emptyLegRoutingProfile.findMany({
        where: { isActive: true, scope: "global" },
      }),
    ]);

    const minHours =
      placement.publicList.minimumQuotableHours != null
        ? Number(placement.publicList.minimumQuotableHours)
        : settings
          ? Number(settings.defaultMinimumQuotableHours)
          : 1.5;

    const breakdown = calculateEmptyLegPrice({
      pricingMode: placement.pricingMode,
      customPrice: placement.customPrice != null ? Number(placement.customPrice) : null,
      displayDiscountMode: placement.displayDiscountMode,
      durationMinutes: placement.emptyLeg.durationMinutes,
      listMinimumQuotableHours: minHours,
      listDiscountPercent:
        placement.publicList.discountPercent != null
          ? Number(placement.publicList.discountPercent)
          : null,
      hourlyRate: profile ? Number(profile.defaultHourlyRate) : null,
      listRoutingProfiles: listProfiles,
      globalRoutingProfiles: globalProfiles,
      depIcao: placement.emptyLeg.depIcao,
      arrIcao: placement.emptyLeg.arrIcao,
      tailNumber: placement.emptyLeg.tailNumber,
    });

    return jsonOk(breakdown);
  } catch (e) {
    return handleApiError(e);
  }
}
