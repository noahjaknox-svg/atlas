import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseOperatingJson } from "@/lib/crew/types";
import type { CrewFleetStatus } from "@prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireDepartmentAccess("data_warehouse");
    const { id } = await params;
    const body = await request.json();
    const row = await prisma.crewFleetAircraft.update({
      where: { id },
      data: {
        tailNumber:
          body.tailNumber != null ? String(body.tailNumber).trim().toUpperCase() : undefined,
        aircraftTypeId:
          body.aircraftTypeId != null ? String(body.aircraftTypeId).trim() : undefined,
        status: body.status != null ? (body.status as CrewFleetStatus) : undefined,
        homeBase:
          body.homeBase !== undefined
            ? body.homeBase
              ? String(body.homeBase).trim().toUpperCase()
              : null
            : undefined,
        serialNumber:
          body.serialNumber !== undefined
            ? body.serialNumber
              ? String(body.serialNumber).trim()
              : null
            : undefined,
        operating: body.operating != null ? parseOperatingJson(body.operating) : undefined,
      },
      include: { aircraftType: true },
    });
    return jsonOk(row);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireDepartmentAccess("data_warehouse");
    const { id } = await params;
    await prisma.crewFleetAircraft.delete({ where: { id } });
    return jsonOk({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
