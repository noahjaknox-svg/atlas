import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { dec } from "@/lib/data-hub-serialize";
import { fetchDataHubList } from "@/lib/data-hub-list";
import { parseOptionalDecimal, parseOptionalString } from "@/lib/data-hub-parse";

async function validIcao(icao: string): Promise<boolean> {
  const match = await prisma.airportReference.findFirst({
    where: { OR: [{ icao: icao }, { ident: icao }] },
    select: { id: true },
  });
  return !!match;
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const result = await fetchDataHubList(
      request,
      "fbos",
      (where, { skip, take }) =>
        prisma.fbo.findMany({
          where,
          skip,
          take,
          orderBy: [{ airportIcao: "asc" }, { fboName: "asc" }],
          include: { _count: { select: { hangarOverrides: true } } },
        }),
      () => prisma.fbo.count(),
      (rows) =>
        rows.map((r) => ({
          id: r.id,
          fboName: r.fboName,
          airportIcao: r.airportIcao,
          baseFuelRate: dec(r.baseFuelRate),
          hangarCostPerSqft: dec(r.hangarCostPerSqft),
          overrides: r._count.hangarOverrides,
        }))
    );
    return jsonOk(result);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const fboName = parseOptionalString(body.fboName);
    const airportIcao = parseOptionalString(body.airportIcao)?.toUpperCase();
    const baseFuelRate = parseOptionalDecimal(body.baseFuelRate);
    if (!fboName || !airportIcao || baseFuelRate === undefined) {
      return jsonError("fboName, airportIcao, and baseFuelRate are required");
    }
    if (!(await validIcao(airportIcao))) {
      return jsonError(`Unknown airport ICAO: ${airportIcao}`);
    }
    const row = await prisma.fbo.create({
      data: {
        fboName,
        airportIcao,
        baseFuelRate,
        hangarCostPerSqft: parseOptionalDecimal(body.hangarCostPerSqft) ?? null,
      },
    });
    return jsonOk(row, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
