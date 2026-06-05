import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const user = await prisma.user.update({
      where: { id },
      data: {
        role: body.role,
        active: typeof body.active === "boolean" ? body.active : undefined,
        name: body.name,
      },
    });

    return jsonOk(user);
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

    const user = await prisma.user.update({
      where: { id },
      data: { active: false },
    });

    return jsonOk(user);
  } catch (e) {
    return handleApiError(e);
  }
}
