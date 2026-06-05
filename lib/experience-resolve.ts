import type { ExperienceSectionSnapshot } from "./experience-content";
import { EXPERIENCE_SECTION_TYPES, mergeSectionWithDefaults } from "./experience-content";
import { getExperienceDefault } from "./experience-defaults";
import type { ProposalSnapshotPayload } from "./snapshot";

export function resolveExperienceSections(
  payload: ProposalSnapshotPayload | null
): ExperienceSectionSnapshot[] {
  const fromPayload = payload?.sections ?? [];

  const hasExperienceSections = fromPayload.some((s) =>
    EXPERIENCE_SECTION_TYPES.includes(s.sectionType as (typeof EXPERIENCE_SECTION_TYPES)[number])
  );

  if (!hasExperienceSections && fromPayload.length > 0) {
    return EXPERIENCE_SECTION_TYPES.map((sectionType, i) => {
      const defaults = getExperienceDefault(sectionType);
      if (!defaults) return null;
      return {
        ...defaults,
        visible: sectionType !== "disclaimer",
        sortOrder: i + 1,
      };
    }).filter((s): s is ExperienceSectionSnapshot => s !== null);
  }

  return EXPERIENCE_SECTION_TYPES.map((sectionType) => {
    const defaults = getExperienceDefault(sectionType);
    if (!defaults) return null;

    const existing = fromPayload.find((s) => s.sectionType === sectionType);
    if (existing) {
      return mergeSectionWithDefaults(existing as ExperienceSectionSnapshot, defaults);
    }

    return { ...defaults, visible: false };
  }).filter((s): s is ExperienceSectionSnapshot => s !== null);
}

export function resolveExperienceSection(
  payload: ProposalSnapshotPayload | null,
  sectionType: string
): ExperienceSectionSnapshot | null {
  const sections = resolveExperienceSections(payload);
  return sections.find((s) => s.sectionType === sectionType) ?? null;
}
