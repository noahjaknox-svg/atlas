import { jsonOk, jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireCrewApiKey, handleCrewApiError } from "@/lib/crew/auth";
import {
  enrichAirportReference,
  findAirportReferenceByCode,
  searchAirportReference,
} from "@/lib/ourairports/lookup";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ icao: string }> }
) {
  try {
    requireCrewApiKey(request);
    const { icao } = await params;
    const airport = await findAirportReferenceByCode(prisma, icao);
    if (!airport) return jsonError("Airport not found", 404);
    return jsonOk(await enrichAirportReference(prisma, airport));
  } catch (e) {
    try {
      return handleCrewApiError(e);
    } catch {
      return jsonError("Internal server error", 500);
    }
  }
}
