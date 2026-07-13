import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireDepartmentAccess("charter");
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.charterLead.findUnique({ where: { id } });
    if (!existing) return jsonError("Not found", 404);

    if (body.assignedRepresentativeUserId !== undefined) {
      const userId = body.assignedRepresentativeUserId;
      if (userId !== null) {
        const user = await prisma.user.findFirst({
          where: {
            id: userId,
            active: true,
            OR: [{ role: "admin" }, { departments: { has: "charter" } }],
          },
        });
        if (!user) return jsonError("Invalid representative", 400);
      }
    }

    const updated = await prisma.charterLead.update({
      where: { id },
      data: {
        ...(body.assignedRepresentativeUserId !== undefined
          ? { assignedRepresentativeUserId: body.assignedRepresentativeUserId }
          : {}),
      },
      include: {
        assignedRepresentative: { select: { id: true, name: true } },
      },
    });

    return jsonOk({
      id: updated.id,
      assignedRepresentative: updated.assignedRepresentative,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
