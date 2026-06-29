import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getExperienceMasterTemplates } from "@/lib/portal-content";

/** Intentionally reset proposal section(s) from global master templates. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInternalUser();
    const { id: proposalId } = await params;
    const body = await request.json().catch(() => ({}));
    const sectionType = typeof body.sectionType === "string" ? body.sectionType : null;
    const resetAll = body.all === true;

    const [sections, masterTemplates] = await Promise.all([
      prisma.proposalSection.findMany({ where: { proposalId } }),
      getExperienceMasterTemplates(),
    ]);

    const targets = resetAll
      ? sections
      : sectionType
        ? sections.filter((s) => s.sectionType === sectionType)
        : [];

    if (targets.length === 0) {
      return jsonError("No matching sections to reset", 404);
    }

    const updated = [];
    for (const section of targets) {
      const master = masterTemplates.find((t) => t.sectionType === section.sectionType);
      if (!master) continue;

      const result = await prisma.proposalSection.update({
        where: { id: section.id },
        data: {
          title: master.title,
          bodyCopy: master.bodyCopy,
          visible: master.visible,
          sortOrder: master.sortOrder,
          imageUrl: master.imageUrl,
          videoUrl: master.videoUrl,
          posterUrl: master.posterUrl,
          layoutVariant: master.layoutVariant,
          calloutMetricLabel: master.calloutMetricLabel,
          calloutMetricValue: master.calloutMetricValue,
          signatoryName: master.signatoryName,
          signatoryTitle: master.signatoryTitle,
          contentBlocks: (master.contentBlocks ?? undefined) as object | undefined,
        },
      });
      updated.push(result);
    }

    return jsonOk({ reset: updated.length, sections: updated });
  } catch (e) {
    return handleApiError(e);
  }
}
