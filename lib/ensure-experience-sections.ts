import { prisma } from "@/lib/db";
import { getExperienceMasterTemplates } from "@/lib/portal-content";
import type { ExperienceMasterTemplate } from "@/lib/experience-master";
import type { Prisma, SectionType } from "@prisma/client";

type ExistingSectionKey = { sectionType: string; pageSlug?: string | null };

function sectionKey(s: ExistingSectionKey): string {
  return s.sectionType === "custom_page"
    ? `custom_page:${s.pageSlug ?? ""}`
    : s.sectionType;
}

/** Master templates that have no matching proposal section row yet (pure; no DB). */
export function findMissingExperienceSections(
  existing: ExistingSectionKey[],
  masterTemplates: ExperienceMasterTemplate[]
): ExperienceMasterTemplate[] {
  const types = new Set(existing.map(sectionKey));
  return masterTemplates.filter((s) => !types.has(sectionKey(s)));
}

/** Rows to insert for the given missing templates. */
export function experienceSectionCreateData(
  proposalId: string,
  missing: ExperienceMasterTemplate[]
): Prisma.ProposalSectionCreateManyInput[] {
  return missing.map((s) => ({
    proposalId,
    sectionType: s.sectionType as SectionType,
    pageSlug: s.pageSlug ?? undefined,
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
    usageTypeIds: s.usageTypeIds ?? [],
  }));
}

/** Ensure new experience sections exist on legacy proposals (seeded from master copy). */
export async function ensureExperienceSections(proposalId: string) {
  const [existing, masterTemplates] = await Promise.all([
    prisma.proposalSection.findMany({
      where: { proposalId },
      select: { sectionType: true, pageSlug: true },
    }),
    getExperienceMasterTemplates(),
  ]);

  const missing = findMissingExperienceSections(existing, masterTemplates);
  if (missing.length === 0) return;

  await prisma.proposalSection.createMany({
    data: experienceSectionCreateData(proposalId, missing),
  });
}
