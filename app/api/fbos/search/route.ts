import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    await requireInternalUser();
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const airportIcao = url.searchParams.get("airportIcao")?.trim().toUpperCase() ?? "";

    const where: Prisma.FboWhereInput = {};
    if (airportIcao) where.airportIcao = { equals: airportIcao, mode: "insensitive" };
    if (q) {
      where.OR = [
        { fboName: { contains: q, mode: "insensitive" } },
        { airportIcao: { contains: q, mode: "insensitive" } },
      ];
    } else if (!airportIcao) {
      return jsonOk([]);
    }

    const rows = await prisma.fbo.findMany({
      where,
      take: 20,
      orderBy: [{ airportIcao: "asc" }, { fboName: "asc" }],
    });

    return jsonOk(
      rows.map((r) => ({
        id: r.id,
        label: `${r.airportIcao} — ${r.fboName}`,
        fboName: r.fboName,
        airportIcao: r.airportIcao,
      }))
    );
  } catch (e) {
    return handleApiError(e);
  }
}
