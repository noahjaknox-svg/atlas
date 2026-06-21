import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseOptionalInt, parseOptionalString } from "@/lib/data-hub-parse";

export async function GET() {
  try {
    await requireAdmin();
    const rows = await prisma.fboHangarOverride.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        fbo: { select: { fboName: true, airportIcao: true } },
        warehouseAircraft: { select: { displayName: true } },
      },
    });
    return jsonOk({
      rows: rows.map((r) => ({
        id: r.id,
        fboId: r.fboId,
        warehouseAircraftId: r.warehouseAircraftId,
        fboName: `${r.fbo.airportIcao} — ${r.fbo.fboName}`,
        aircraft: r.warehouseAircraft.displayName,
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
    await requireAdmin();
    const body = await request.json();
    const fboId = parseOptionalString(body.fboId);
    const warehouseAircraftId = parseOptionalString(body.warehouseAircraftId);
    const annualRate = parseOptionalInt(body.annualRate);
    if (!fboId || !warehouseAircraftId || annualRate === undefined) {
      return jsonError("fboId, warehouseAircraftId, and annualRate are required");
    }
    const row = await prisma.fboHangarOverride.create({
      data: { fboId, warehouseAircraftId, annualRate },
    });
    return jsonOk(row, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
