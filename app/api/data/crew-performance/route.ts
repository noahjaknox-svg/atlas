import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import type { AircraftPerformanceMetric } from "@prisma/client";
import type { CrewGridValues } from "@/lib/crew/types";

export async function GET() {
  try {
    await requireDepartmentAccess("data_warehouse");
    const rows = await prisma.aircraftPerformanceGrid.findMany({
      include: { aircraftType: true },
      orderBy: [{ aircraftType: { code: "asc" } }, { metric: "asc" }],
    });
    return jsonOk({
      rows: rows.map((g) => ({
        id: g.id,
        aircraftTypeId: g.aircraftTypeId,
        aircraftTypeCode: g.aircraftType.code,
        metric: g.metric,
        unit: g.unit,
        pressureAltitudeFt: g.pressureAltitudeFt,
        weightLb: g.weightLb,
        oatC: g.oatC,
        gridSize: `${g.pressureAltitudeFt.length}×${g.weightLb.length}×${g.oatC.length}`,
        updatedAt: g.updatedAt.toISOString(),
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
    const aircraftTypeId = String(body.aircraftTypeId ?? "").trim();
    const metric = String(body.metric ?? "").trim() as AircraftPerformanceMetric;
    if (!aircraftTypeId || !metric) {
      return handleApiError(new Error("aircraftTypeId and metric are required"));
    }
    const row = await prisma.aircraftPerformanceGrid.upsert({
      where: {
        aircraftTypeId_metric: { aircraftTypeId, metric },
      },
      create: {
        aircraftTypeId,
        metric,
        unit: body.unit ?? "ft",
        pressureAltitudeFt: body.axes?.pressureAltitudeFt ?? body.pressureAltitudeFt,
        weightLb: body.axes?.weightLb ?? body.weightLb,
        oatC: body.axes?.oatC ?? body.oatC,
        values: body.values as CrewGridValues,
      },
      update: {
        unit: body.unit ?? "ft",
        pressureAltitudeFt: body.axes?.pressureAltitudeFt ?? body.pressureAltitudeFt,
        weightLb: body.axes?.weightLb ?? body.weightLb,
        oatC: body.axes?.oatC ?? body.oatC,
        values: body.values as CrewGridValues,
      },
    });
    return jsonOk(row);
  } catch (e) {
    return handleApiError(e);
  }
}
