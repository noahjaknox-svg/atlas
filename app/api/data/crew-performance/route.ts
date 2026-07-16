import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import type { AircraftPerformanceMetric } from "@prisma/client";
import type { CrewGridValues } from "@/lib/crew/types";
import { metricFromWire } from "@/lib/crew/wire-format";
import { parsePerformanceModel } from "@/lib/crew/performance-model";

const V1_METRICS = new Set(["takeoffFieldLength", "landingDistance"]);

function resolveMetric(raw: string): AircraftPerformanceMetric {
  const m = metricFromWire(raw);
  if (!V1_METRICS.has(m)) {
    throw new Error(
      `Unsupported metric "${raw}". v1 allows takeoff_field_length and landing_distance only.`
    );
  }
  return m;
}

function resolveTypeId(body: {
  aircraftTypeId?: string;
  aircraftTypeCode?: string;
}): Promise<{ id: string; code: string | null } | null> {
  const idOrCode = String(body.aircraftTypeId ?? body.aircraftTypeCode ?? "").trim();
  if (!idOrCode) return Promise.resolve(null);
  // UUID vs type code
  if (/^[0-9a-f-]{36}$/i.test(idOrCode)) {
    return prisma.aircraftType.findUnique({
      where: { id: idOrCode },
      select: { id: true, code: true },
    });
  }
  return prisma.aircraftType.findUnique({
    where: { code: idOrCode.toUpperCase() },
    select: { id: true, code: true },
  });
}

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
        source: g.source,
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

/** Upsert one performance grid row (same shape as /sync performance[]). */
export async function POST(request: Request) {
  try {
    await requireDepartmentAccess("data_warehouse");
    const body = await request.json();
    const type = await resolveTypeId(body);
    if (!type) return jsonError("aircraftTypeId or aircraftTypeCode is required", 400);

    const metric = resolveMetric(String(body.metric ?? "").trim());
    const source =
      typeof body.source === "string" && body.source.trim()
        ? body.source.trim()
        : null;
    if (!source) {
      return jsonError(
        "source citation is required (e.g. POH Section 5 or calibrated stand-in note)",
        400
      );
    }

    const row = await prisma.aircraftPerformanceGrid.upsert({
      where: {
        aircraftTypeId_metric: { aircraftTypeId: type.id, metric },
      },
      create: {
        aircraftTypeId: type.id,
        metric,
        unit: body.unit ?? "ft",
        pressureAltitudeFt: body.axes?.pressureAltitudeFt ?? body.pressureAltitudeFt,
        weightLb: body.axes?.weightLb ?? body.weightLb,
        oatC: body.axes?.oatC ?? body.oatC,
        values: body.values as CrewGridValues,
        source,
      },
      update: {
        unit: body.unit ?? "ft",
        pressureAltitudeFt: body.axes?.pressureAltitudeFt ?? body.pressureAltitudeFt,
        weightLb: body.axes?.weightLb ?? body.weightLb,
        oatC: body.axes?.oatC ?? body.oatC,
        values: body.values as CrewGridValues,
        source,
      },
    });
    return jsonOk(row);
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * AFM package upload: { aircraftTypeId|aircraftTypeCode, performanceModel?,
 * performance: [...rows], afmNotes? }
 */
export async function PUT(request: Request) {
  try {
    await requireDepartmentAccess("data_warehouse");
    const body = await request.json();
    const type = await resolveTypeId(body);
    if (!type) return jsonError("aircraftTypeId or aircraftTypeCode is required", 400);

    const performanceModel = parsePerformanceModel(body.performanceModel);
    const afmNotes =
      typeof body.afmNotes === "string" && body.afmNotes.trim()
        ? body.afmNotes.trim()
        : null;

    if (performanceModel || afmNotes !== null) {
      await prisma.aircraftType.update({
        where: { id: type.id },
        data: {
          ...(performanceModel ? { performanceModel } : {}),
          ...(afmNotes !== null ? { afmNotes } : {}),
        },
      });
    }

    const rows = Array.isArray(body.performance) ? body.performance : [];
    let upserted = 0;
    for (const row of rows) {
      const metric = resolveMetric(String(row.metric ?? "").trim());
      const source =
        typeof row.source === "string" && row.source.trim()
          ? row.source.trim()
          : null;
      if (!source) {
        return jsonError(
          `source citation required for metric ${row.metric}`,
          400
        );
      }
      await prisma.aircraftPerformanceGrid.upsert({
        where: {
          aircraftTypeId_metric: { aircraftTypeId: type.id, metric },
        },
        create: {
          aircraftTypeId: type.id,
          metric,
          unit: row.unit ?? "ft",
          pressureAltitudeFt: row.axes?.pressureAltitudeFt ?? row.pressureAltitudeFt,
          weightLb: row.axes?.weightLb ?? row.weightLb,
          oatC: row.axes?.oatC ?? row.oatC,
          values: row.values as CrewGridValues,
          source,
        },
        update: {
          unit: row.unit ?? "ft",
          pressureAltitudeFt: row.axes?.pressureAltitudeFt ?? row.pressureAltitudeFt,
          weightLb: row.axes?.weightLb ?? row.weightLb,
          oatC: row.axes?.oatC ?? row.oatC,
          values: row.values as CrewGridValues,
          source,
        },
      });
      upserted += 1;
    }

    return jsonOk({
      aircraftTypeId: type.id,
      aircraftTypeCode: type.code,
      performanceModelUpdated: Boolean(performanceModel),
      gridsUpserted: upserted,
      afmNotes,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
