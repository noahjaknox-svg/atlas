import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseOptionalDate, parseOptionalDecimal, parseOptionalInt, parseOptionalString } from "@/lib/data-hub-parse";
import type { CrewRole, DataConfidence, TrainingType } from "@prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const row = await prisma.trainingCost.update({
      where: { id },
      data: {
        role: parseOptionalString(body.role) as CrewRole | undefined,
        trainingType: parseOptionalString(body.trainingType) as TrainingType | undefined,
        annualCost: parseOptionalDecimal(body.annualCost),
        travelCost: parseOptionalDecimal(body.travelCost),
        daysRequired: parseOptionalInt(body.daysRequired),
        provider: parseOptionalString(body.provider),
        source: parseOptionalString(body.source),
        confidence: parseOptionalString(body.confidence) as DataConfidence | undefined,
        effectiveDate: parseOptionalDate(body.effectiveDate),
      },
    });
    return jsonOk(row);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.trainingCost.delete({ where: { id } });
    return jsonOk({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
