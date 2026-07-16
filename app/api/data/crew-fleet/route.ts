import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseOperatingJson } from "@/lib/crew/types";
import type { AircraftTailStatus } from "@prisma/client";

export async function GET() {
  try {
    await requireDepartmentAccess("data_warehouse");
    const rows = await prisma.aircraftTail.findMany({
      include: { aircraftType: true },
      orderBy: { tailNumber: "asc" },
    });
    return jsonOk({
      rows: rows.map((f) => ({
        id: f.id,
        tailNumber: f.tailNumber,
        aircraftTypeId: f.aircraftTypeId,
        aircraftTypeCode: f.aircraftType.code,
        aircraftTypeLabel: `${f.aircraftType.manufacturer} ${f.aircraftType.model}`,
        status: f.status,
        homeBase: f.homeBase,
        serialNumber: f.serialNumber,
        operating: f.operating,
        updatedAt: f.updatedAt.toISOString(),
      })),
      total: rows.length,
      filtered: rows.length,
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireDepartmentAccess("data_warehouse");
    const body = await request.json();
    const tailNumber = String(body.tailNumber ?? "").trim().toUpperCase();
    const aircraftTypeId = String(body.aircraftTypeId ?? "").trim();
    if (!tailNumber || !aircraftTypeId) {
      return handleApiError(new Error("tailNumber and aircraftTypeId are required"));
    }
    const operating = parseOperatingJson(body.operating);
    const row = await prisma.aircraftTail.create({
      data: {
        tailNumber,
        aircraftTypeId,
        status: (body.status ?? "active") as AircraftTailStatus,
        homeBase: body.homeBase ? String(body.homeBase).trim().toUpperCase() : null,
        serialNumber: body.serialNumber ? String(body.serialNumber).trim() : null,
        operating,
        // Promote key airframe weights into dedicated Tail columns.
        basicEmptyWeightLb: operating.basicEmptyWeightLb,
        mtowLb: operating.mtowLb,
        mzfwLb: operating.mzfwLb,
        maxBagWeightLb: operating.maxBagWeightLb,
      },
      include: { aircraftType: true },
    });
    return jsonOk(row);
  } catch (e) {
    return handleApiError(e);
  }
}
