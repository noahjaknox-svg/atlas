import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import {
  computeRunwayGradientEstimated,
  computeRunwayGradientHighEndEstimated,
} from "@/lib/ourairports/gradient";
import { findAirportReferenceByCode } from "@/lib/ourairports/lookup";
import { runwayDesignator } from "@/lib/ourairports/runway-admin";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const icao = url.searchParams.get("icao")?.trim();
    if (!icao) {
      return jsonOk({ airport: null, runways: [] });
    }

    const airport = await findAirportReferenceByCode(prisma, icao);
    if (!airport) {
      return jsonOk({ airport: null, runways: [] });
    }

    const runways = airport.runways
      .filter((r) => !r.closed)
      .sort((a, b) => (b.lengthFt ?? 0) - (a.lengthFt ?? 0))
      .map((r) => ({
        id: r.id,
        runwayId: runwayDesignator(r.leIdent, r.heIdent),
        leIdent: r.leIdent,
        heIdent: r.heIdent,
        lengthFt: r.lengthFt,
        gradientPctVerified: r.gradientPctVerified,
        gradientHighEndVerified: r.gradientHighEndVerified,
        gradientPctEstimated:
          r.gradientPctEstimated ?? computeRunwayGradientEstimated(r),
        gradientHighEndEstimated: computeRunwayGradientHighEndEstimated(r),
      }));

    return jsonOk({
      airport: {
        id: airport.id,
        icao: airport.icao ?? airport.ident,
        name: airport.name,
        municipality: airport.municipality,
      },
      runways,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
