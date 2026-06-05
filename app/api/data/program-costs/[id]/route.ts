import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseOptionalDate, parseOptionalDecimal, parseOptionalInt, parseOptionalString } from "@/lib/data-hub-parse";
import type { DataConfidence, ProgramType } from "@prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const row = await prisma.programCost.update({
      where: { id },
      data: {
        programType: parseOptionalString(body.programType) as ProgramType | undefined,
        provider: parseOptionalString(body.provider),
        hourlyRate: parseOptionalDecimal(body.hourlyRate),
        minimumAnnualHours: parseOptionalInt(body.minimumAnnualHours),
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
    await prisma.programCost.delete({ where: { id } });
    return jsonOk({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
