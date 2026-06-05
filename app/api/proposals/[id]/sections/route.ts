import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInternalUser();
    const { id: proposalId } = await params;
    const body = await request.json();
    const items = Array.isArray(body) ? body : body.sections;

    if (!Array.isArray(items)) {
      return jsonError("Expected sections array");
    }

    const results = [];
    for (const item of items) {
      if (!item.id) return jsonError("Each section requires id");
      const existing = await prisma.proposalSection.findFirst({
        where: { id: item.id, proposalId },
      });
      if (!existing) return jsonError("Section not found", 404);
      const result = await prisma.proposalSection.update({
        where: { id: item.id },
        data: {
          title: item.title,
          bodyCopy: item.bodyCopy,
          visible: typeof item.visible === "boolean" ? item.visible : undefined,
          sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : undefined,
          imageUrl: item.imageUrl !== undefined ? item.imageUrl : undefined,
          videoUrl: item.videoUrl !== undefined ? item.videoUrl : undefined,
          posterUrl: item.posterUrl !== undefined ? item.posterUrl : undefined,
          calloutMetricLabel:
            item.calloutMetricLabel !== undefined ? item.calloutMetricLabel : undefined,
          calloutMetricValue:
            item.calloutMetricValue !== undefined ? item.calloutMetricValue : undefined,
        } as any,
      });
      results.push(result);
    }

    return jsonOk(results);
  } catch (e) {
    return handleApiError(e);
  }
}
