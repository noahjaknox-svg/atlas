import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { fetchDataHubList } from "@/lib/data-hub-list";
import { findAirportReferencesUsFirst } from "@/lib/ourairports/us-first-list";

// Read-only browser/search over the OurAirports reference data.
export async function GET(request: Request) {
  try {
    await requireDepartmentAccess("data_warehouse");
    const result = await fetchDataHubList(
      request,
      "airports",
      (where, { skip, take }) => findAirportReferencesUsFirst(prisma, where, { skip, take }),
      () => prisma.airportReference.count(),
      (rows) =>
        rows.map((a) => ({
          id: a.id,
          icao: a.icao ?? a.ident,
          iata: a.iata,
          name: a.name,
          municipality: a.municipality,
          isoRegion: a.isoRegion,
          isoCountry: a.isoCountry,
        }))
    );
    return jsonOk(result);
  } catch (e) {
    return handleApiError(e);
  }
}
