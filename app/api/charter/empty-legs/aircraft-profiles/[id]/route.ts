import type { AircraftTypeStatus } from "@prisma/client";
import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import { aircraftTypeLabel } from "@/lib/charter/empty-legs/price-placement";

// URL path kept for compatibility, but these "pricing profiles" now operate on
// AircraftType empty-leg default fields (unified aircraft model).
type AircraftTypeRow = {
  id: string;
  displayName: string;
  manufacturer: string | null;
  model: string | null;
  emptyLegHourlyRate: Decimal | null;
  emptyLegMinimumHours: Decimal | null;
  emptyLegOffRoutingHours: Decimal | null;
  status: AircraftTypeStatus;
  createdAt: Date;
  updatedAt: Date;
};

function serialize(r: AircraftTypeRow) {
  return {
    id: r.id,
    name: r.displayName,
    label: aircraftTypeLabel(r),
    defaultHourlyRate: r.emptyLegHourlyRate != null ? Number(r.emptyLegHourlyRate) : null,
    minimumQuotableTimeFallback:
      r.emptyLegMinimumHours != null ? Number(r.emptyLegMinimumHours) : null,
    offRoutingTimeAllowanceHours:
      r.emptyLegOffRoutingHours != null ? Number(r.emptyLegOffRoutingHours) : null,
    isActive: r.status === "published",
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireDepartmentAccess("charter");
    const { id } = await params;
    const body = await request.json();
    const existing = await prisma.aircraftType.findUnique({ where: { id } });
    if (!existing) return jsonError("Not found", 404);

    const updated = await prisma.aircraftType.update({
      where: { id },
      data: {
        ...(typeof body.name === "string" ? { displayName: body.name.trim() } : {}),
        ...(body.defaultHourlyRate === null
          ? { emptyLegHourlyRate: null }
          : body.defaultHourlyRate != null
            ? { emptyLegHourlyRate: new Decimal(body.defaultHourlyRate) }
            : {}),
        ...(body.minimumQuotableTimeFallback === null
          ? { emptyLegMinimumHours: null }
          : body.minimumQuotableTimeFallback != null
            ? { emptyLegMinimumHours: new Decimal(body.minimumQuotableTimeFallback) }
            : {}),
        ...(body.offRoutingTimeAllowanceHours === null
          ? { emptyLegOffRoutingHours: null }
          : body.offRoutingTimeAllowanceHours != null
            ? {
                emptyLegOffRoutingHours: new Decimal(body.offRoutingTimeAllowanceHours),
              }
            : {}),
        ...(typeof body.isActive === "boolean"
          ? { status: body.isActive ? "published" : "draft" }
          : {}),
      },
    });

    return jsonOk(serialize(updated));
  } catch (e) {
    return handleApiError(e);
  }
}
