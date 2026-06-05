import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseOptionalDate, parseOptionalDecimal, parseOptionalString } from "@/lib/data-hub-parse";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const row = await prisma.stateCostFactor.update({
      where: { id },
      data: {
        registrationTaxRatePct: parseOptionalDecimal(body.registrationTaxRatePct),
        jetFuelTaxDifferentialPerGal: parseOptionalDecimal(body.jetFuelTaxDifferentialPerGal),
        registrationNotes: parseOptionalString(body.registrationNotes),
        taxNotes: parseOptionalString(body.taxNotes),
        source: parseOptionalString(body.source),
        lastReviewed: parseOptionalDate(body.lastReviewed),
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
    await prisma.stateCostFactor.delete({ where: { id } });
    return jsonOk({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
