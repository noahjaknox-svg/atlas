import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { dec, dateStr } from "@/lib/data-hub-serialize";
import { fetchDataHubList } from "@/lib/data-hub-list";
import { parseOptionalDate, parseOptionalDecimal, parseOptionalInt, parseOptionalString } from "@/lib/data-hub-parse";
import type { DataConfidence, ProgramType } from "@prisma/client";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const result = await fetchDataHubList(
      request,
      "program-costs",
      (where, { skip, take }) =>
        prisma.programCost.findMany({
          where,
          skip,
          take,
          include: { aircraftMaster: { select: { manufacturer: true, model: true } } },
          orderBy: { updatedAt: "desc" },
        }),
      () => prisma.programCost.count(),
      (rows) =>
        rows.map((r) => ({
          id: r.id,
          aircraftMasterId: r.aircraftMasterId,
          aircraft: `${r.aircraftMaster.manufacturer} ${r.aircraftMaster.model}`,
          programType: r.programType,
          provider: r.provider,
          hourlyRate: dec(r.hourlyRate),
          minimumAnnualHours: r.minimumAnnualHours,
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
    const programType = parseOptionalString(body.programType) as ProgramType | undefined;
    if (!aircraftMasterId || !programType) {
      return jsonError("aircraftMasterId and programType required");
    }
    const row = await prisma.programCost.create({
      data: {
        aircraftMasterId,
        programType,
        provider: parseOptionalString(body.provider),
        hourlyRate: parseOptionalDecimal(body.hourlyRate),
        minimumAnnualHours: parseOptionalInt(body.minimumAnnualHours),
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
