import { requireInternalUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    await requireInternalUser();
    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (q.length < 1) return jsonOk([]);

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

    return jsonOk(airports);
  } catch (e) {
    return handleApiError(e);
  }
}
