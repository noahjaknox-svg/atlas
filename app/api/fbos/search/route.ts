import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    await requireInternalUser();
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const airportId = url.searchParams.get("airportId")?.trim() ?? "";

    const where: Prisma.FboLocationWhereInput = {};

    if (airportId) {
      where.airportId = airportId;
    }

    if (q.length >= 1) {
      where.fboName = { contains: q, mode: "insensitive" };
    } else if (!airportId) {
      return jsonOk([]);
    }

    const rows = await prisma.fboLocation.findMany({
      where,
      take: 20,
      orderBy: { fboName: "asc" },
      include: { airport: { select: { icao: true, airportName: true } } },
    });

    return jsonOk(
      rows.map((r) => ({
        id: r.id,
        label: `${r.airport.icao} — ${r.fboName}`,
        fboName: r.fboName,
        airportId: r.airportId,
      }))
    );
  } catch (e) {
    return handleApiError(e);
  }
}
