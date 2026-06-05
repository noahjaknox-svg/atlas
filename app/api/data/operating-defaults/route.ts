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
      "operating-defaults",
      (where) =>
        prisma.aircraftOperatingDefault.findMany({
          where,
          orderBy: [{ aircraftMasterId: "asc" }, { costKey: "asc" }],
          include: {
            aircraftMaster: { select: { manufacturer: true, model: true } },
          },
        }),
      () => prisma.aircraftOperatingDefault.count(),
      (rows) =>
        rows.map((r) => ({
          id: r.id,
          aircraftMasterId: r.aircraftMasterId,
          aircraft: `${r.aircraftMaster.manufacturer} ${r.aircraftMaster.model}`,
          costKey: r.costKey,
          annualAmount: dec(r.annualAmount),
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
    const costKey = parseOptionalString(body.costKey);
    const annualAmount = parseOptionalDecimal(body.annualAmount);
    if (!aircraftMasterId || !costKey || annualAmount == null) {
      return jsonError("aircraftMasterId, costKey, and annualAmount required");
    }
    const row = await prisma.aircraftOperatingDefault.create({
      data: {
        aircraftMasterId,
        costKey,
        annualAmount,
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
