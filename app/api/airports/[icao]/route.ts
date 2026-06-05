import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { resolveHangarCostFromRows } from "@/lib/resolve-hangar-cost";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ icao: string }> }
) {
  try {
    await requireInternalUser();
    const { icao } = await params;
    const url = new URL(request.url);
    const aircraftMasterId = url.searchParams.get("aircraftMasterId");
    const fboName = url.searchParams.get("fboName");

    const airport = await prisma.airport.findUnique({
      where: { icao: icao.toUpperCase() },
      include: {
        fuelPrices: { take: 1, orderBy: { effectiveDate: "desc" } },
        hangarCosts: { take: 1, orderBy: { effectiveDate: "desc" } },
        fboLocations: { orderBy: { fboName: "asc" } },
      },
    });
    if (!airport) return jsonError("Airport not found", 404);

    const fuel = airport.fuelPrices[0];
    let hangarMonthly: string | null =
      airport.hangarCosts[0]?.monthlyCostBase?.toString() ?? null;

    if (aircraftMasterId) {
      const master = await prisma.aircraftMaster.findUnique({
        where: { id: aircraftMasterId },
      });
      const fboMatch = fboName
        ? airport.fboLocations.find(
            (f) => f.fboName.toLowerCase() === fboName.toLowerCase()
          )
        : null;

      const hangarRows = await prisma.hangarCost.findMany({
        where: {
          airportId: airport.id,
          aircraftMasterId,
          ...(fboMatch ? { fboLocationId: fboMatch.id } : {}),
        },
        orderBy: { effectiveDate: "desc" },
        take: 5,
      });

      const resolved = resolveHangarCostFromRows({
        hangarRows,
        cabinSqft: master?.cabinSqft,
      });
      if (resolved) hangarMonthly = resolved.hangar_monthly;
    }

    return jsonOk({
      icao: airport.icao,
      airportName: airport.airportName,
      city: airport.city,
      state: airport.state,
      fuelPrice: fuel?.retailFuelPrice?.toString() ?? fuel?.homeFuelPrice?.toString() ?? null,
      hangarMonthly,
      fbos: airport.fboLocations.map((f) => ({
        id: f.id,
        fboName: f.fboName,
        jetARetailPrice: f.jetARetailPrice?.toString() ?? null,
        jetAContractPrice: f.jetAContractPrice?.toString() ?? null,
      })),
    });
  } catch (e) {
    return handleApiError(e);
  }
}
