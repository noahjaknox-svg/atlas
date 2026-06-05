import type { ExperienceSectionSnapshot } from "./experience-content";
import { EXPERIENCE_SECTION_TYPES, mergeSectionWithDefaults } from "./experience-content";
import { getExperienceDefault } from "./experience-defaults";
import type { ProposalSnapshotPayload } from "./snapshot";

/** Tabs added with PrismJet Experience — legacy snapshots only had pro_forma/disclaimer. */
const CORE_EXPERIENCE_SECTION_TYPES = EXPERIENCE_SECTION_TYPES.filter(
  (t) => t !== "pro_forma" && t !== "disclaimer"
);

function synthesizeExperienceDefaults(): ExperienceSectionSnapshot[] {
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

export function resolveExperienceSections(
  payload: ProposalSnapshotPayload | null
): ExperienceSectionSnapshot[] {
  const fromPayload = payload?.sections ?? [];

  const hasCoreExperienceSections = fromPayload.some((s) =>
    CORE_EXPERIENCE_SECTION_TYPES.includes(
      s.sectionType as (typeof CORE_EXPERIENCE_SECTION_TYPES)[number]
    )
  );

  // Pre-experience snapshots (cover, pro_forma, etc.) — render full experience defaults.
  if (!hasCoreExperienceSections) {
    return synthesizeExperienceDefaults();
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
