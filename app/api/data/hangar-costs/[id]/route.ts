import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseOptionalDate, parseOptionalDecimal, parseOptionalString } from "@/lib/data-hub-parse";
import type { DataConfidence, HangarPricingMethod } from "@prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const row = await prisma.hangarCost.update({
      where: { id },
      data: {
        fboLocationId: body.fboLocationId === null ? null : parseOptionalString(body.fboLocationId),
        aircraftMasterId:
          body.aircraftMasterId === null ? null : parseOptionalString(body.aircraftMasterId),
        provider: parseOptionalString(body.provider),
        pricingMethod: parseOptionalString(body.pricingMethod) as HangarPricingMethod | undefined,
        quotedAnnual: parseOptionalDecimal(body.quotedAnnual),
        ratePerSqftAnnual: parseOptionalDecimal(body.ratePerSqftAnnual),
        monthlyCostBase: parseOptionalDecimal(body.monthlyCostBase),
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
    await prisma.hangarCost.delete({ where: { id } });
    return jsonOk({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
