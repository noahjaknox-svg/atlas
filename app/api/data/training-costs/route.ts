import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { dec, dateStr } from "@/lib/data-hub-serialize";
import { fetchDataHubList } from "@/lib/data-hub-list";
import { parseOptionalDate, parseOptionalDecimal, parseOptionalInt, parseOptionalString } from "@/lib/data-hub-parse";
import type { CrewRole, DataConfidence, TrainingType } from "@prisma/client";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const result = await fetchDataHubList(
      request,
      "training-costs",
      (where) =>
        prisma.trainingCost.findMany({
          where,
          include: { aircraftMaster: { select: { manufacturer: true, model: true } } },
          orderBy: { updatedAt: "desc" },
        }),
      () => prisma.trainingCost.count(),
      (rows) =>
        rows.map((r) => ({
          id: r.id,
          aircraftMasterId: r.aircraftMasterId,
          aircraft: `${r.aircraftMaster.manufacturer} ${r.aircraftMaster.model}`,
          role: r.role,
          trainingType: r.trainingType,
          annualCost: dec(r.annualCost),
          travelCost: dec(r.travelCost),
          daysRequired: r.daysRequired,
          provider: r.provider,
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
    const trainingType = (parseOptionalString(body.trainingType) as TrainingType) ?? "recurrent";
    if (!aircraftMasterId || !role) return jsonError("aircraftMasterId and role required");

    const row = await prisma.trainingCost.create({
      data: {
        aircraftMasterId,
        role,
        trainingType,
        annualCost: parseOptionalDecimal(body.annualCost),
        travelCost: parseOptionalDecimal(body.travelCost),
        daysRequired: parseOptionalInt(body.daysRequired),
        provider: parseOptionalString(body.provider),
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
