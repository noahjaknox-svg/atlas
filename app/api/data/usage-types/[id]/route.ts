import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseOptionalInt, parseOptionalString } from "@/lib/data-hub-parse";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireDepartmentAccess("data_warehouse");
    const { id } = await params;
    const body = await request.json();
    const row = await prisma.usageType.update({
      where: { id },
      data: {
        name: parseOptionalString(body.name),
        sortOrder: parseOptionalInt(body.sortOrder),
        active: typeof body.active === "boolean" ? body.active : undefined,
        charterEnabled: typeof body.charterEnabled === "boolean" ? body.charterEnabled : undefined,
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
    await requireDepartmentAccess("data_warehouse");
    const { id } = await params;
    await prisma.usageType.delete({ where: { id } });
    return jsonOk({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
