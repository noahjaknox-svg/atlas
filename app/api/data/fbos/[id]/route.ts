import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseOptionalDecimal, parseOptionalString } from "@/lib/data-hub-parse";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const fbo = await prisma.fboLocation.update({
      where: { id },
      data: {
        fboName: parseOptionalString(body.fboName),
        phone: parseOptionalString(body.phone),
        website: parseOptionalString(body.website),
        jetARetailPrice: parseOptionalDecimal(body.jetARetailPrice),
        jetAContractPrice: parseOptionalDecimal(body.jetAContractPrice),
        manualOverride:
          typeof body.manualOverride === "boolean" ? body.manualOverride : undefined,
        source: parseOptionalString(body.source),
      },
    });
    return jsonOk(fbo);
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
    await prisma.fboLocation.delete({ where: { id } });
    return jsonOk({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
