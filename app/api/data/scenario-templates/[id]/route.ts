import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseOptionalString } from "@/lib/data-hub-parse";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const row = await prisma.scenarioTemplate.update({
      where: { id },
      data: {
        name: parseOptionalString(body.name),
        aircraftMasterId: parseOptionalString(body.aircraftMasterId),
        description: parseOptionalString(body.description),
      },
      include: { assumptions: true },
    });

    if (Array.isArray(body.assumptions)) {
      await prisma.scenarioTemplateAssumption.deleteMany({ where: { templateId: id } });
      await prisma.scenarioTemplateAssumption.createMany({
        data: body.assumptions.map((a: { assumptionKey: string; value: string }) => ({
          templateId: id,
          assumptionKey: a.assumptionKey,
          value: String(a.value),
        })),
      });
    }

    const updated = await prisma.scenarioTemplate.findUnique({
      where: { id },
      include: { assumptions: true },
    });
    return jsonOk(updated ?? row);
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
    await prisma.scenarioTemplate.delete({ where: { id } });
    return jsonOk({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
