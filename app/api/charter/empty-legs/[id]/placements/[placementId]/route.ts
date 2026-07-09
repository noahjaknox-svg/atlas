import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import type {
  EmptyLegDiscountDisplayMode,
  EmptyLegPlacementStatus,
  EmptyLegPricingMode,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; placementId: string }> }
) {
  try {
    await requireDepartmentAccess("charter");
    const { id, placementId } = await params;
    const body = await request.json();

    const placement = await prisma.emptyLegPlacement.findFirst({
      where: { id: placementId, emptyLegId: id },
    });
    if (!placement) return jsonError("Placement not found", 404);

    const data: {
      status?: EmptyLegPlacementStatus;
      pricingMode?: EmptyLegPricingMode;
      customPrice?: Decimal | null;
      displayDiscountMode?: EmptyLegDiscountDisplayMode;
    } = {};

    if (body.status) data.status = body.status;
    if (body.pricingMode) data.pricingMode = body.pricingMode;
    if (body.displayDiscountMode) data.displayDiscountMode = body.displayDiscountMode;
    if (body.customPrice === null) data.customPrice = null;
    else if (typeof body.customPrice === "number") data.customPrice = new Decimal(body.customPrice);

    const updated = await prisma.emptyLegPlacement.update({
      where: { id: placementId },
      data,
      include: { publicList: { select: { id: true, name: true, slug: true, isActive: true } } },
    });

    return jsonOk({
      id: updated.id,
      publicListId: updated.publicListId,
      publicListName: updated.publicList.name,
      status: updated.status,
      pricingMode: updated.pricingMode,
      customPrice: updated.customPrice != null ? Number(updated.customPrice) : null,
      displayDiscountMode: updated.displayDiscountMode,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
