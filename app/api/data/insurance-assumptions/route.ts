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
      "insurance-assumptions",
      (where) =>
        prisma.insuranceAssumption.findMany({
          where,
          include: { aircraftMaster: { select: { manufacturer: true, model: true } } },
          orderBy: { updatedAt: "desc" },
        }),
      () => prisma.insuranceAssumption.count(),
      (rows) =>
        rows.map((r) => ({
          id: r.id,
          aircraftMasterId: r.aircraftMasterId,
          aircraft: `${r.aircraftMaster.manufacturer} ${r.aircraftMaster.model}`,
          state: r.state,
          annualPremiumEstimate: dec(r.annualPremiumEstimate),
          hullValueLow: dec(r.hullValueLow),
          hullValueHigh: dec(r.hullValueHigh),
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

    const row = await prisma.insuranceAssumption.create({
      data: {
        aircraftMasterId,
        state: parseOptionalString(body.state),
        annualPremiumEstimate: parseOptionalDecimal(body.annualPremiumEstimate),
        hullValueLow: parseOptionalDecimal(body.hullValueLow),
        hullValueHigh: parseOptionalDecimal(body.hullValueHigh),
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
