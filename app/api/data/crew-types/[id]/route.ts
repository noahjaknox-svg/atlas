import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parsePerformanceModel } from "@/lib/crew/performance-model";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireDepartmentAccess("data_warehouse");
    const { id } = await params;
    const body = await request.json();
    const performanceModel =
      body.performanceModel === null
        ? null
        : body.performanceModel != null
          ? parsePerformanceModel(body.performanceModel)
          : undefined;
    if (body.performanceModel != null && performanceModel === null && body.performanceModel !== null) {
      return handleApiError(new Error("Invalid performanceModel shape"));
    }

    const row = await prisma.aircraftType.update({
      where: { id },
      data: {
        code: body.code != null ? String(body.code).trim().toUpperCase() : undefined,
        manufacturer: body.manufacturer != null ? String(body.manufacturer).trim() : undefined,
        model: body.model != null ? String(body.model).trim() : undefined,
        ...(performanceModel !== undefined
          ? { performanceModel: performanceModel ?? undefined }
          : {}),
        ...(body.afmNotes !== undefined
          ? {
              afmNotes:
                typeof body.afmNotes === "string" && body.afmNotes.trim()
                  ? body.afmNotes.trim()
                  : null,
            }
          : {}),
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
    await prisma.aircraftType.delete({ where: { id } });
    return jsonOk({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
