import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseUsageTypeConfig } from "@/lib/usage-type-config";
import { toUsageTypeWire, usageTypeBodySchema } from "@/lib/usage-type-api";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireDepartmentAccess("data_warehouse");
    const { id } = await params;
    const parsed = usageTypeBodySchema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid usage type");
    const body = parsed.data;
    const row = await prisma.usageType.update({
      where: { id },
      data: {
        name: body.name,
        sortOrder: body.sortOrder,
        active: body.active,
        charterEnabled: body.charterEnabled,
        config: body.config ? parseUsageTypeConfig(body.config) : undefined,
      },
    });
    return jsonOk(toUsageTypeWire(row));
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
