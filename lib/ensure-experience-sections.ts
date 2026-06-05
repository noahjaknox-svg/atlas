import { prisma } from "@/lib/db";
import { EXPERIENCE_DEFAULT_SECTIONS_FOR_CREATE } from "@/lib/experience-defaults";
import type { SectionType } from "@prisma/client";

/** Ensure new experience sections exist on legacy proposals. */
export async function ensureExperienceSections(proposalId: string) {
  const existing = await prisma.proposalSection.findMany({
    where: { proposalId },
    select: { sectionType: true },
  });
  const types = new Set(existing.map((s) => s.sectionType));
  const missing = EXPERIENCE_DEFAULT_SECTIONS_FOR_CREATE.filter(
    (s) => !types.has(s.sectionType as SectionType)
  );
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
