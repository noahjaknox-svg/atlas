import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { createPublicListToken } from "@/lib/charter/empty-legs/sync";

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
      data: {
        token: createPublicListToken(),
        tokenRevokedAt: null,
      },
    });

    return jsonOk({
      id: updated.id,
      token: updated.token,
      tokenRevokedAt: null,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
