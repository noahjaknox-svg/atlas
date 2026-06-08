import { prisma } from "@/lib/db";
import { getExperienceMasterTemplates } from "@/lib/portal-content";
import type { SectionType } from "@prisma/client";
/** Ensure new experience sections exist on legacy proposals (seeded from master copy). */
export async function ensureExperienceSections(proposalId: string) {  const [existing, masterTemplates] = await Promise.all([
    prisma.proposalSection.findMany({
      where: { proposalId },
      select: { sectionType: true },
    }),
    getExperienceMasterTemplates(),
  ]);

  const types = new Set(existing.map((s) => s.sectionType));
  const missing = masterTemplates.filter((s) => !types.has(s.sectionType as SectionType));
  if (missing.length === 0) return;

  await prisma.proposalSection.createMany({
    data: missing.map((s) => ({
      proposalId,
      sectionType: s.sectionType as SectionType,
      title: s.title,
      sortOrder: s.sortOrder,
      visible: s.visible,
      bodyCopy: s.bodyCopy,
      layoutVariant: s.layoutVariant,
      contentBlocks: s.contentBlocks ?? undefined,
      signatoryName: s.signatoryName,
      signatoryTitle: s.signatoryTitle,
      imageUrl: s.imageUrl,
      videoUrl: s.videoUrl,
      posterUrl: s.posterUrl,
      calloutMetricLabel: s.calloutMetricLabel,
      calloutMetricValue: s.calloutMetricValue,
    })),
  });
}
