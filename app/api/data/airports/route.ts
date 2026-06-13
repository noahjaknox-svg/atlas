import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { fetchDataHubList } from "@/lib/data-hub-list";
import { parseOptionalString } from "@/lib/data-hub-parse";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const result = await fetchDataHubList(
      request,
      "airports",
      (where, { skip, take }) =>
        prisma.airport.findMany({
          where,
          skip,
          take,
          orderBy: { icao: "asc" },
          include: { _count: { select: { fboLocations: true } } },
        }),
      () => prisma.airport.count(),
      (airports) =>
        airports.map((a) => ({
          id: a.id,
          icao: a.icao,
          airportName: a.airportName,
          city: a.city,
          state: a.state,
          country: a.country,
          fboCount: a._count.fboLocations,
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
    const icao = parseOptionalString(body.icao)?.toUpperCase();
    const airportName = parseOptionalString(body.airportName);
    if (!icao || !airportName) return jsonError("icao and airportName required");

    const airport = await prisma.airport.create({
      data: {
        icao,
        airportName,
        city: parseOptionalString(body.city),
        state: parseOptionalString(body.state),
        country: parseOptionalString(body.country) ?? "US",
        iata: parseOptionalString(body.iata),
        timezone: parseOptionalString(body.timezone),
      },
    });
    return jsonOk(airport, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
