import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { mergeEmptyLegFromHistory } from "@/lib/charter/empty-legs/merge";
import { emptyLegListInclude, serializeEmptyLeg } from "@/lib/charter/empty-legs/serialize";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireDepartmentAccess("charter");
    const { id } = await params;
    const body = (await request.json()) as { sourceId?: string };
    if (!body.sourceId) return jsonError("sourceId is required", 400);

    const merged = await mergeEmptyLegFromHistory(prisma, {
      targetId: id,
      sourceId: body.sourceId,
    });
    if (!merged) return jsonError("Merge failed", 500);

    const row = await prisma.emptyLeg.findUnique({
      where: { id },
      include: emptyLegListInclude,
    });
    if (!row) return jsonError("Not found", 404);
    return jsonOk(serializeEmptyLeg(row));
  } catch (e) {
    if (e instanceof Error) return jsonError(e.message, 400);
    return handleApiError(e);
  }
}
