import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { resolveEmptyLegDepartureTimezone } from "@/lib/charter/empty-legs/display-timezone";
import { prisma } from "@/lib/db";
import { findFbosAtAirport } from "@/lib/fbo-airport-lookup";
import {
  enrichAirportReference,
  findAirportReferenceByCode,
} from "@/lib/ourairports/lookup";
import { serializeCrewAirport } from "@/lib/ourairports/crew-wire";
import {
  loadEmptyLegTimezoneLayers,
  timezoneAbbr,
} from "@/lib/schedule/airport-timezones";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ icao: string }> }
) {
  try {
    await requireInternalUser();
    const { icao } = await params;
    const code = icao.toUpperCase();
    const url = new URL(request.url);
    const aircraftTypeId = url.searchParams.get("aircraftTypeId");

    const reference = await findAirportReferenceByCode(prisma, icao);
    if (!reference) return jsonError("Airport not found", 404);

    const fbos = await findFbosAtAirport(code);

    // Cheapest base fuel rate at the field, if any FBOs are on file.
    const fuelPrice =
      fbos.length > 0
        ? Math.min(...fbos.map((f) => Number(f.baseFuelRate))).toString()
        : null;

    // Hangar: per-aircraft override wins; else hangarCostPerSqft x aircraft sqft.
    let hangarMonthly: string | null = null;
    if (aircraftTypeId) {
      const aircraft = await prisma.aircraftType.findUnique({
        where: { id: aircraftTypeId },
        select: { squareFootage: true },
      });
      const override = await prisma.fboHangarOverride.findFirst({
        where: { aircraftTypeId, fbo: { airportIcao: { equals: code, mode: "insensitive" } } },
      });
      if (override) {
        hangarMonthly = (override.annualRate / 12).toFixed(2);
      } else if (aircraft) {
        const ratePerSqft = fbos
          .map((f) => (f.hangarCostPerSqft == null ? null : Number(f.hangarCostPerSqft)))
          .filter((n): n is number => n != null);
        if (ratePerSqft.length > 0 && aircraft.squareFootage != null) {
          const annual = Math.min(...ratePerSqft) * aircraft.squareFootage;
          hangarMonthly = (annual / 12).toFixed(2);
        }
      }
    }

    const referenceWire = await enrichAirportReference(prisma, reference);
    const crew = serializeCrewAirport(reference);

    const timezoneCodes = Array.from(
      new Set(
        [code, reference.icao, reference.ident, reference.gpsCode, reference.localCode]
          .filter((c): c is string => Boolean(c?.trim()))
          .map((c) => c.trim().toUpperCase())
      )
    );
    const layers = await loadEmptyLegTimezoneLayers(prisma, timezoneCodes);
    let timezoneResolution = resolveEmptyLegDepartureTimezone(
      referenceWire?.icao ?? code,
      layers
    );
    if (!timezoneResolution.timeZone) {
      for (const candidate of timezoneCodes) {
        timezoneResolution = resolveEmptyLegDepartureTimezone(candidate, layers);
        if (timezoneResolution.timeZone) break;
      }
    }
    const timezoneIana = timezoneResolution.timeZone;
    const timezoneShort =
      timezoneIana != null
        ? timezoneAbbr(new Date().toISOString(), timezoneIana)
        : null;

    return jsonOk({
      icao: referenceWire?.icao ?? code,
      ident: referenceWire?.ident ?? code,
      airportName: referenceWire?.name ?? code,
      city: referenceWire?.municipality ?? null,
      state: null,
      country: referenceWire?.countryName ?? null,
      iata: referenceWire?.iata ?? null,
      elevationFt: referenceWire?.elevationFt ?? null,
      latitudeDeg: referenceWire?.latitudeDeg ?? null,
      longitudeDeg: referenceWire?.longitudeDeg ?? null,
      longestRunwayFt: referenceWire?.longestRunwayFt ?? null,
      timezone: {
        iana: timezoneIana,
        abbreviation: timezoneShort,
        source: timezoneResolution.source,
        confidence: timezoneResolution.confidence,
      },
      fuelPrice,
      hangarMonthly,
      fbos: fbos.map((f) => ({
        id: f.id,
        fboName: f.fboName,
        baseFuelRate: f.baseFuelRate.toString(),
        hangarCostPerSqft: f.hangarCostPerSqft?.toString() ?? null,
      })),
      reference: referenceWire,
      hasAtlasPricing: fbos.length > 0,
      crew: {
        terrain: crew.terrain,
        multiRunway: crew.multiRunway,
        gradientPct: crew.gradientPct,
        gradientHighEndRunway: crew.gradientHighEndRunway,
        primaryRunwayId: crew.runwayId,
        runways: crew.runways,
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
