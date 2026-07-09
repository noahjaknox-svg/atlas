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

export async function GET() {
  try {
    await requireDepartmentAccess("charter");
    const rows = await prisma.emptyLegAircraftProfile.findMany({
      orderBy: { name: "asc" },
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

    const created = await prisma.emptyLegAircraftProfile.create({
      data: {
        name: String(body.name).trim(),
        defaultHourlyRate: new Decimal(body.defaultHourlyRate),
        minimumQuotableTimeFallback:
          body.minimumQuotableTimeFallback != null
            ? new Decimal(body.minimumQuotableTimeFallback)
            : null,
        offRoutingTimeAllowanceHours:
          body.offRoutingTimeAllowanceHours != null
            ? new Decimal(body.offRoutingTimeAllowanceHours)
            : null,
        isActive: body.isActive !== false,
      },
    });

    return jsonOk(serialize(created), 201);
  } catch (e) {
    return handleApiError(e);
  }
}
