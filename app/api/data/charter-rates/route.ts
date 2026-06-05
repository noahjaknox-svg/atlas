import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { dec, dateStr } from "@/lib/data-hub-serialize";
import { fetchDataHubList } from "@/lib/data-hub-list";
import { parseOptionalDate, parseOptionalDecimal, parseOptionalString } from "@/lib/data-hub-parse";
import type { DataConfidence } from "@prisma/client";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const result = await fetchDataHubList(
      request,
      "charter-rates",
      (where) =>
        prisma.charterMarketRate.findMany({
          where,
          include: {
            aircraftMaster: { select: { manufacturer: true, model: true } },
            airport: { select: { icao: true } },
          },
          orderBy: { updatedAt: "desc" },
        }),
      () => prisma.charterMarketRate.count(),
      (rows) =>
        rows.map((r) => ({
          id: r.id,
          aircraftMasterId: r.aircraftMasterId,
          aircraft: `${r.aircraftMaster.manufacturer} ${r.aircraftMaster.model}`,
          airportId: r.airportId,
          airportIcao: r.airport?.icao ?? null,
          retailRateBase: dec(r.retailRateBase),
          fuelSurcharge: dec(r.fuelSurcharge),
          ownerPaybackPercent: dec(r.ownerPaybackPercent),
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
    const aircraftMasterId = parseOptionalString(body.aircraftMasterId);
    if (!aircraftMasterId) return jsonError("aircraftMasterId required");

    const row = await prisma.charterMarketRate.create({
      data: {
        aircraftMasterId,
        airportId: parseOptionalString(body.airportId),
        retailRateBase: parseOptionalDecimal(body.retailRateBase),
        retailRateLow: parseOptionalDecimal(body.retailRateLow),
        retailRateHigh: parseOptionalDecimal(body.retailRateHigh),
        fuelSurcharge: parseOptionalDecimal(body.fuelSurcharge),
        ownerPaybackPercent: parseOptionalDecimal(body.ownerPaybackPercent),
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
