import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ icao: string }> }
) {
  try {
    await requireInternalUser();
    const { icao } = await params;
    const airport = await prisma.airport.findUnique({
      where: { icao: icao.toUpperCase() },
      include: {
        fuelPrices: { take: 1, orderBy: { effectiveDate: "desc" } },
        hangarCosts: { take: 3, orderBy: { effectiveDate: "desc" } },
      },
    });
    if (!airport) return jsonError("Airport not found", 404);
    return jsonOk(airport);
  } catch (e) {
    return handleApiError(e);
  }
}
