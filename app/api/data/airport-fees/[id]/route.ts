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
    const row = await prisma.airportFeeSchedule.update({
      where: { id },
      data: {
        annualFee: parseOptionalDecimal(body.annualFee),
        source: parseOptionalString(body.source),
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
    await prisma.airportFeeSchedule.delete({ where: { id } });
    return jsonOk({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
