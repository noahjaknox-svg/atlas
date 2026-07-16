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

export async function GET() {
  try {
    await requireDepartmentAccess("charter");
    const rows = await prisma.aircraftType.findMany({
      orderBy: { displayName: "asc" },
    });
    return jsonOk(rows.map(serialize));
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireDepartmentAccess("charter");
    const body = await request.json();
    if (!body.name?.trim()) return jsonError("name is required", 400);
    if (body.defaultHourlyRate == null || Number.isNaN(Number(body.defaultHourlyRate))) {
      return jsonError("defaultHourlyRate is required", 400);
    }

    const created = await prisma.aircraftType.create({
      data: {
        displayName: String(body.name).trim(),
        emptyLegHourlyRate: new Decimal(body.defaultHourlyRate),
        emptyLegMinimumHours:
          body.minimumQuotableTimeFallback != null
            ? new Decimal(body.minimumQuotableTimeFallback)
            : null,
        emptyLegOffRoutingHours:
          body.offRoutingTimeAllowanceHours != null
            ? new Decimal(body.offRoutingTimeAllowanceHours)
            : null,
        status: body.isActive === false ? "draft" : "published",
      },
    });

    return jsonOk(serialize(created), 201);
  } catch (e) {
    return handleApiError(e);
  }
}
