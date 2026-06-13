import { jsonOk, jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireCrewApiKey, handleCrewApiError } from "@/lib/crew/auth";
import { findAirportReferenceByCode } from "@/lib/ourairports/lookup";
import { serializeCrewAirport } from "@/lib/ourairports/crew-wire";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ icao: string }> }
) {
  try {
    requireCrewApiKey(request);
    const { icao } = await params;
    const ref = await findAirportReferenceByCode(prisma, icao);
    if (!ref) return jsonError("Airport not found", 404);
    return jsonOk(serializeCrewAirport(ref));
  } catch (e) {
    try {
      return handleCrewApiError(e);
    } catch {
      return jsonError("Internal server error", 500);
    }
  }
}
