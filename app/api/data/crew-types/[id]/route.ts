import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const row = await prisma.crewAircraftType.update({
      where: { id },
      data: {
        code: body.code != null ? String(body.code).trim().toUpperCase() : undefined,
        manufacturer: body.manufacturer != null ? String(body.manufacturer).trim() : undefined,
        model: body.model != null ? String(body.model).trim() : undefined,
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
    await prisma.crewAircraftType.delete({ where: { id } });
    return jsonOk({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
