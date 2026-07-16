import type { AircraftTypeStatus } from "@prisma/client";
import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import { aircraftTypeLabel } from "@/lib/charter/empty-legs/price-placement";

// URL path kept for compatibility, but these "pricing profiles" now operate on
// AircraftType empty-leg default fields (unified aircraft model).
// Type creation lives in Data Hub / warehouse — empty legs only lists + edits pricing.
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

export async function POST() {
  return jsonError(
    "Aircraft types are created in Data Hub. Empty legs can only edit pricing on existing types.",
    405
  );
}
