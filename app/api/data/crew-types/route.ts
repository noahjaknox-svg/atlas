import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parsePerformanceModel } from "@/lib/crew/performance-model";
import { deriveAfmStatus } from "@/lib/crew/afm-status";
import { canonicalCrewTypeCode } from "@/lib/crew/type-codes";

export async function GET() {
  try {
    await requireDepartmentAccess("data_warehouse");
    const rows = await prisma.aircraftType.findMany({
      include: { performance: true },
      orderBy: { code: "asc" },
    });
    return jsonOk({
      rows: rows.map((t) => {
        const code = canonicalCrewTypeCode(t.code ?? "");
        const hasModel = Boolean(parsePerformanceModel(t.performanceModel));
        const { afmStatus, afmNotes } = deriveAfmStatus({
          code,
          hasPerformanceModel: hasModel,
          grids: t.performance.map((g) => ({ metric: g.metric, source: g.source })),
          storedAfmNotes: t.afmNotes,
        });
        return {
          id: t.id,
          code: t.code,
          manufacturer: t.manufacturer,
          model: t.model,
          performanceModel: parsePerformanceModel(t.performanceModel),
          afmNotes: t.afmNotes,
          afmStatus,
          derivedAfmNotes: afmNotes ?? null,
          updatedAt: t.updatedAt.toISOString(),
        };
      }),
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
    const code = String(body.code ?? "").trim().toUpperCase();
    const manufacturer = String(body.manufacturer ?? "").trim();
    const model = String(body.model ?? "").trim();
    if (!code || !manufacturer || !model) {
      return handleApiError(new Error("code, manufacturer, and model are required"));
    }
    const displayName = [manufacturer, model].filter(Boolean).join(" ").trim() || code;
    const performanceModel = parsePerformanceModel(body.performanceModel);
    const afmNotes =
      typeof body.afmNotes === "string" && body.afmNotes.trim()
        ? body.afmNotes.trim()
        : null;
    const row = await prisma.aircraftType.create({
      data: {
        code,
        displayName,
        manufacturer,
        model,
        ...(performanceModel ? { performanceModel } : {}),
        ...(afmNotes ? { afmNotes } : {}),
      },
    });
    return jsonOk({
      id: row.id,
      code: row.code,
      manufacturer: row.manufacturer,
      model: row.model,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
