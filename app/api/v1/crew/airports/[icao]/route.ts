import { jsonOk, jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireCrewApiKey, handleCrewApiError } from "@/lib/crew/auth";
import { findAirportReferenceByCode } from "@/lib/ourairports/lookup";
import { serializeCrewAirport } from "@/lib/ourairports/crew-wire";
import { decimalToNumber } from "@/lib/ourairports/lookup-utils";
import {
  loadAirportTimezoneOverrides,
  resolveCrewAirportTimeZone,
} from "@/lib/schedule/airport-timezones";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ icao: string }> }
) {
  try {
    requireCrewApiKey(request);
    const { icao } = await params;
    const ref = await findAirportReferenceByCode(prisma, icao);
    if (!ref) return jsonError("Airport not found", 404);

    const code = (ref.icao ?? ref.ident).toUpperCase();
    const overrides = await loadAirportTimezoneOverrides(prisma, [code]);
    const lat = decimalToNumber(ref.latitudeDeg);
    const lon = decimalToNumber(ref.longitudeDeg);
    const timeZone = resolveCrewAirportTimeZone({
      icao: code,
      lat,
      lon,
      override: overrides[code] ?? null,
    });

    return jsonOk(serializeCrewAirport(ref, { timeZone }));
  } catch (e) {
    try {
      return handleCrewApiError(e);
    } catch {
      return jsonError("Internal server error", 500);
    }
  }
}
