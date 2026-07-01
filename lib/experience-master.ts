import type { ExperienceContentBlocks, ExperienceSectionSnapshot } from "./experience-content";
import { mergeSectionWithDefaults } from "./experience-content";
import { EXPERIENCE_DEFAULT_SECTIONS, getExperienceDefault } from "./experience-defaults";

/** Master template for one experience page — stored on portal_content.experience_templates. */
export type ExperienceMasterTemplate = {
  sectionType: string;
  pageSlug?: string | null;
  title: string;
  bodyCopy: string | null;
  visible: boolean;
  sortOrder: number;
  imageUrl: string | null;
  videoUrl: string | null;
  posterUrl: string | null;
  signatoryName: string | null;
  signatoryTitle: string | null;
  layoutVariant: string | null;
  calloutMetricLabel: string | null;
  calloutMetricValue: string | null;
  contentBlocks: ExperienceContentBlocks | null;
};

export function codeDefaultsAsMasterTemplates(): ExperienceMasterTemplate[] {
  return EXPERIENCE_DEFAULT_SECTIONS.map((s, i) => ({
    sectionType: s.sectionType,
    title: s.title,
    bodyCopy: s.bodyCopy,
    visible: s.sectionType !== "disclaimer",
    sortOrder: i + 1,
    imageUrl: s.imageUrl,
    videoUrl: s.videoUrl,
    posterUrl: s.posterUrl,
    signatoryName: s.signatoryName,
    signatoryTitle: s.signatoryTitle,
    layoutVariant: s.layoutVariant,
    calloutMetricLabel: s.calloutMetricLabel,
    calloutMetricValue: s.calloutMetricValue,
    contentBlocks: s.contentBlocks ?? null,
  }));
}

export function parseExperienceMasterTemplates(raw: unknown): ExperienceMasterTemplate[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const parsed: ExperienceMasterTemplate[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || !("sectionType" in item)) continue;
    const row = item as ExperienceMasterTemplate;
    if (!row.sectionType || !row.title) continue;
    parsed.push({
      sectionType: row.sectionType,
      pageSlug: row.pageSlug ?? null,
      title: row.title,
      bodyCopy: row.bodyCopy ?? null,
      visible: row.visible !== false,
      sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : parsed.length + 1,
      imageUrl: row.imageUrl ?? null,
      videoUrl: row.videoUrl ?? null,
      posterUrl: row.posterUrl ?? null,
      signatoryName: row.signatoryName ?? null,
      signatoryTitle: row.signatoryTitle ?? null,
      layoutVariant: row.layoutVariant ?? null,
      calloutMetricLabel: row.calloutMetricLabel ?? null,
      calloutMetricValue: row.calloutMetricValue ?? null,
      contentBlocks: row.contentBlocks ?? null,
    });
  }
  return parsed.length > 0 ? parsed : null;
}

export function getMasterTemplateForSection(
  templates: ExperienceMasterTemplate[] | null | undefined,
  sectionType: string
): ExperienceMasterTemplate | null {
  if (!templates?.length) return null;
  return templates.find((t) => t.sectionType === sectionType) ?? null;
}

/** Merge code defaults with portal master template (master wins on defined fields). */
export function masterToSectionSnapshot(
  master: ExperienceMasterTemplate
): ExperienceSectionSnapshot {
  const code = getExperienceDefault(master.sectionType);
  const base: ExperienceSectionSnapshot = code ?? {
    sectionType: master.sectionType,
    title: master.title,
    bodyCopy: master.bodyCopy,
    visible: master.visible,
    sortOrder: master.sortOrder,
    imageUrl: master.imageUrl,
    videoUrl: master.videoUrl,
    posterUrl: master.posterUrl,
    calloutMetricLabel: master.calloutMetricLabel,
    calloutMetricValue: master.calloutMetricValue,
    layoutVariant: master.layoutVariant,
    contentBlocks: master.contentBlocks,
    signatoryName: master.signatoryName,
    signatoryTitle: master.signatoryTitle,
  };

  return mergeSectionWithDefaults(
    {
      sectionType: master.sectionType,
      pageSlug: master.pageSlug ?? null,
      title: master.title,
      bodyCopy: master.bodyCopy,
      visible: master.visible,
      sortOrder: master.sortOrder,
      imageUrl: master.imageUrl,
      videoUrl: master.videoUrl,
      posterUrl: master.posterUrl,
      calloutMetricLabel: master.calloutMetricLabel,
      calloutMetricValue: master.calloutMetricValue,
      layoutVariant: master.layoutVariant,
      contentBlocks: master.contentBlocks,
      signatoryName: master.signatoryName,
      signatoryTitle: master.signatoryTitle,
    },
    base
  );
}

export function getExperienceDefaultFromMaster(
  sectionType: string,
  masterTemplates?: ExperienceMasterTemplate[] | null
): ExperienceSectionSnapshot | null {
  const master = getMasterTemplateForSection(masterTemplates, sectionType);
  if (master) return masterToSectionSnapshot(master);
  return getExperienceDefault(sectionType);
}

/** Shape used when seeding proposal_sections from master. */
export function masterTemplateForProposalCreate(
  master: ExperienceMasterTemplate
): Omit<ExperienceMasterTemplate, "sectionType"> & { sectionType: string } {
  return { ...master };
}
