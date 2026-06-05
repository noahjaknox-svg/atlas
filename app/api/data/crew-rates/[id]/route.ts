import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseOptionalDate, parseOptionalDecimal, parseOptionalString } from "@/lib/data-hub-parse";
import type { CrewRole, DataConfidence } from "@prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const row = await prisma.crewRate.update({
      where: { id },
      data: {
        role: parseOptionalString(body.role) as CrewRole | undefined,
        salaryBase: parseOptionalDecimal(body.salaryBase),
        salaryLow: parseOptionalDecimal(body.salaryLow),
        salaryHigh: parseOptionalDecimal(body.salaryHigh),
        benefitsPercent: parseOptionalDecimal(body.benefitsPercent),
        payrollTaxPercent: parseOptionalDecimal(body.payrollTaxPercent),
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
    await prisma.crewRate.delete({ where: { id } });
    return jsonOk({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
