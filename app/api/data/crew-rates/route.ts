import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { dec, dateStr } from "@/lib/data-hub-serialize";
import { fetchDataHubList } from "@/lib/data-hub-list";
import { parseOptionalDate, parseOptionalDecimal, parseOptionalString } from "@/lib/data-hub-parse";
import type { CrewRole, DataConfidence } from "@prisma/client";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const result = await fetchDataHubList(
      request,
      "crew-rates",
      (where) =>
        prisma.crewRate.findMany({
          where,
          include: { aircraftMaster: { select: { manufacturer: true, model: true } } },
          orderBy: { updatedAt: "desc" },
        }),
      () => prisma.crewRate.count(),
      (rates) =>
        rates.map((r) => ({
          id: r.id,
          aircraftMasterId: r.aircraftMasterId,
          aircraft: r.aircraftMaster
            ? `${r.aircraftMaster.manufacturer} ${r.aircraftMaster.model}`
            : null,
          role: r.role,
          salaryBase: dec(r.salaryBase),
          salaryLow: dec(r.salaryLow),
          salaryHigh: dec(r.salaryHigh),
          benefitsPercent: dec(r.benefitsPercent),
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
    const role = parseOptionalString(body.role) as CrewRole | undefined;
    if (!aircraftMasterId || !role) return jsonError("aircraftMasterId and role required");

    const row = await prisma.crewRate.create({
      data: {
        aircraftMasterId,
        role,
        salaryBase: parseOptionalDecimal(body.salaryBase),
        salaryLow: parseOptionalDecimal(body.salaryLow),
        salaryHigh: parseOptionalDecimal(body.salaryHigh),
        benefitsPercent: parseOptionalDecimal(body.benefitsPercent),
        payrollTaxPercent: parseOptionalDecimal(body.payrollTaxPercent),
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
