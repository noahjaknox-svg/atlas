import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { searchAirportReference } from "@/lib/ourairports/lookup";

export async function GET(request: Request) {
  try {
    await requireInternalUser();
    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (q.length < 1) return jsonOk([]);

    const referenceHits = await searchAirportReference(prisma, q, 15);

    if (referenceHits.length > 0) {
      return jsonOk(
        referenceHits.map((hit) => ({
          id: hit.ident,
          icao: hit.icao,
          airportName: hit.name,
          city: hit.municipality,
          state: null,
          iata: hit.iata,
          type: hit.type,
          source: "ourairports" as const,
        }))
      );
    }

    const airports = await prisma.airport.findMany({
      where: {
        OR: [
          { icao: { contains: q, mode: "insensitive" } },
          { airportName: { contains: q, mode: "insensitive" } },
          { city: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 15,
      orderBy: { icao: "asc" },
      select: { id: true, icao: true, airportName: true, city: true, state: true },
    });

    return jsonOk(
      airports.map((a) => ({
        ...a,
        source: "atlas" as const,
      }))
    );
  } catch (e) {
    return handleApiError(e);
  }
}
