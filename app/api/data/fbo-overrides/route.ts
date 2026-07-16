import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseOptionalInt, parseOptionalString } from "@/lib/data-hub-parse";

export async function GET() {
  try {
    await requireDepartmentAccess("data_warehouse");
    const rows = await prisma.fboHangarOverride.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        fbo: { select: { fboName: true, airportIcao: true } },
        aircraftType: { select: { displayName: true } },
      },
    });
    return jsonOk({
      rows: rows.map((r) => ({
        id: r.id,
        fboId: r.fboId,
        aircraftTypeId: r.aircraftTypeId,
        fboName: `${r.fbo.airportIcao} — ${r.fbo.fboName}`,
        aircraft: r.aircraftType.displayName,
        annualRate: r.annualRate,
      })),
      total: rows.length,
      filtered: rows.length,
      page: 1,
      pageSize: rows.length,
      hasMore: false,
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireDepartmentAccess("data_warehouse");
    const body = await request.json();
    const fboId = parseOptionalString(body.fboId);
    const aircraftTypeId = parseOptionalString(body.aircraftTypeId);
    const annualRate = parseOptionalInt(body.annualRate);
    if (!fboId || !aircraftTypeId || annualRate === undefined) {
      return jsonError("fboId, aircraftTypeId, and annualRate are required");
    }
    const row = await prisma.fboHangarOverride.create({
      data: { fboId, aircraftTypeId, annualRate },
    });
    return jsonOk(row, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
