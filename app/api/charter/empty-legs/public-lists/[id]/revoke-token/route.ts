import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireDepartmentAccess("charter");
    const { id } = await params;
    const existing = await prisma.emptyLegPublicList.findUnique({ where: { id } });
    if (!existing) return jsonError("Not found", 404);

    const updated = await prisma.emptyLegPublicList.update({
      where: { id },
      data: { tokenRevokedAt: new Date(), isActive: false },
    });

    return jsonOk({
      id: updated.id,
      tokenRevokedAt: updated.tokenRevokedAt?.toISOString() ?? null,
      isActive: updated.isActive,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
