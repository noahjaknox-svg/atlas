import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import {
  buildEmptyLegWhere,
  emptyLegListInclude,
  serializeEmptyLeg,
  type EmptyLegFilters,
} from "@/lib/charter/empty-legs/serialize";
import type {
  EmptyLegAvailabilityStatus,
  EmptyLegForceState,
  EmptyLegLifecycleStatus,
  EmptyLegPlacementStatus,
} from "@prisma/client";

export async function GET(request: Request) {
  try {
    await requireDepartmentAccess("charter");
    const params = new URL(request.url).searchParams;

    const filters: EmptyLegFilters = {
      lifecycleStatus: (params.get("lifecycleStatus") as EmptyLegLifecycleStatus) || "active",
      availabilityStatus: (params.get("availabilityStatus") as EmptyLegAvailabilityStatus) || undefined,
      forceState: (params.get("forceState") as EmptyLegForceState | "none") || undefined,
      isFeatured: params.get("isFeatured") === "true" ? true : params.get("isFeatured") === "false" ? false : undefined,
      tailNumber: params.get("tailNumber") || undefined,
      route: params.get("route") || undefined,
      publicListId: params.get("publicListId") || undefined,
      placementStatus: (params.get("placementStatus") as EmptyLegPlacementStatus) || undefined,
      dateFrom: params.get("dateFrom") || undefined,
      dateTo: params.get("dateTo") || undefined,
      includePast: params.get("includePast") === "true",
      q: params.get("q") || undefined,
    };

    const rows = await prisma.emptyLeg.findMany({
      where: buildEmptyLegWhere(filters),
      include: emptyLegListInclude,
      orderBy: [{ isFeatured: "desc" }, { scheduledDepartureAt: "asc" }],
      take: 500,
    });

    return jsonOk(rows.map(serializeEmptyLeg));
  } catch (e) {
    return handleApiError(e);
  }
}
