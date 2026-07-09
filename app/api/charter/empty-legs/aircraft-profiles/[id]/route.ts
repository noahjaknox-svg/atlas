import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

function serialize(r: {
  id: string;
  name: string;
  defaultHourlyRate: Decimal;
  minimumQuotableTimeFallback: Decimal | null;
  offRoutingTimeAllowanceHours: Decimal | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: r.id,
    name: r.name,
    defaultHourlyRate: Number(r.defaultHourlyRate),
    minimumQuotableTimeFallback:
      r.minimumQuotableTimeFallback != null ? Number(r.minimumQuotableTimeFallback) : null,
    offRoutingTimeAllowanceHours:
      r.offRoutingTimeAllowanceHours != null ? Number(r.offRoutingTimeAllowanceHours) : null,
    isActive: r.isActive,
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
    const existing = await prisma.emptyLegAircraftProfile.findUnique({ where: { id } });
    if (!existing) return jsonError("Not found", 404);

    const updated = await prisma.emptyLegAircraftProfile.update({
      where: { id },
      data: {
        ...(typeof body.name === "string" ? { name: body.name.trim() } : {}),
        ...(body.defaultHourlyRate != null
          ? { defaultHourlyRate: new Decimal(body.defaultHourlyRate) }
          : {}),
        ...(body.minimumQuotableTimeFallback === null
          ? { minimumQuotableTimeFallback: null }
          : body.minimumQuotableTimeFallback != null
            ? { minimumQuotableTimeFallback: new Decimal(body.minimumQuotableTimeFallback) }
            : {}),
        ...(body.offRoutingTimeAllowanceHours === null
          ? { offRoutingTimeAllowanceHours: null }
          : body.offRoutingTimeAllowanceHours != null
            ? {
                offRoutingTimeAllowanceHours: new Decimal(body.offRoutingTimeAllowanceHours),
              }
            : {}),
        ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}),
      },
    });

    return jsonOk(serialize(updated));
  } catch (e) {
    return handleApiError(e);
  }
}
