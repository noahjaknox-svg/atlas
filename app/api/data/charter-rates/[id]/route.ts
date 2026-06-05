import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseOptionalDate, parseOptionalDecimal, parseOptionalString } from "@/lib/data-hub-parse";
import type { DataConfidence } from "@prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const row = await prisma.charterMarketRate.update({
      where: { id },
      data: {
        airportId: body.airportId === null ? null : parseOptionalString(body.airportId),
        retailRateBase: parseOptionalDecimal(body.retailRateBase),
        retailRateLow: parseOptionalDecimal(body.retailRateLow),
        retailRateHigh: parseOptionalDecimal(body.retailRateHigh),
        fuelSurcharge: parseOptionalDecimal(body.fuelSurcharge),
        ownerPaybackPercent: parseOptionalDecimal(body.ownerPaybackPercent),
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
    await prisma.charterMarketRate.delete({ where: { id } });
    return jsonOk({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
