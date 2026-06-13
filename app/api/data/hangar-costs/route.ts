import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { dec, dateStr } from "@/lib/data-hub-serialize";
import { fetchDataHubList } from "@/lib/data-hub-list";
import { parseOptionalDate, parseOptionalDecimal, parseOptionalString } from "@/lib/data-hub-parse";
import type { AircraftCategory, DataConfidence, HangarPricingMethod } from "@prisma/client";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const result = await fetchDataHubList(
      request,
      "hangar-costs",
      (where, { skip, take }) =>
        prisma.hangarCost.findMany({
          where,
          skip,
          take,
          include: {
            airport: { select: { icao: true } },
            aircraftMaster: { select: { manufacturer: true, model: true } },
            fboLocation: { select: { fboName: true } },
          },
          orderBy: { updatedAt: "desc" },
        }),
      () => prisma.hangarCost.count(),
      (rows) =>
        rows.map((r) => ({
          id: r.id,
          airportId: r.airportId,
          airportIcao: r.airport.icao,
          aircraftMasterId: r.aircraftMasterId,
          aircraft: r.aircraftMaster
            ? `${r.aircraftMaster.manufacturer} ${r.aircraftMaster.model}`
            : null,
          fboLocationId: r.fboLocationId,
          fboName: r.fboLocation?.fboName ?? r.provider,
          pricingMethod: r.pricingMethod,
          quotedAnnual: dec(r.quotedAnnual),
          ratePerSqftAnnual: dec(r.ratePerSqftAnnual),
          monthlyCostBase: dec(r.monthlyCostBase),
          aircraftCategory: r.aircraftCategory,
          source: r.source,
          confidence: r.confidence,
          effectiveDate: dateStr(r.effectiveDate),
        }))
    );
    return jsonOk(result);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const airportId = parseOptionalString(body.airportId);
    const aircraftCategory = parseOptionalString(body.aircraftCategory) as AircraftCategory | undefined;
    if (!airportId || !aircraftCategory) {
      return jsonError("airportId and aircraftCategory required");
    }

    const row = await prisma.hangarCost.create({
      data: {
        airportId,
        aircraftCategory,
        aircraftMasterId: parseOptionalString(body.aircraftMasterId),
        fboLocationId: parseOptionalString(body.fboLocationId),
        provider: parseOptionalString(body.provider),
        pricingMethod:
          (parseOptionalString(body.pricingMethod) as HangarPricingMethod) ?? "category_estimate",
        quotedAnnual: parseOptionalDecimal(body.quotedAnnual),
        ratePerSqftAnnual: parseOptionalDecimal(body.ratePerSqftAnnual),
        monthlyCostBase: parseOptionalDecimal(body.monthlyCostBase),
        source: parseOptionalString(body.source),
        confidence: (parseOptionalString(body.confidence) as DataConfidence) ?? "medium",
        effectiveDate: parseOptionalDate(body.effectiveDate),
      },
    });
    return jsonOk(row, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
