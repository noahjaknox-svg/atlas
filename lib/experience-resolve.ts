import type { ExperienceSectionSnapshot } from "./experience-content";
import {
  EXPERIENCE_SECTION_TYPES,
  mergeSectionWithDefaults,
  sanitizeExperiencePageLinks,
} from "./experience-content";
import { getExperienceDefaultFromMaster, masterToSectionSnapshot } from "./experience-master";
import type { ExperienceMasterTemplate } from "./experience-master";
import type { ProposalSnapshotPayload } from "./snapshot";

/** Tabs added with PrismJet Experience — legacy snapshots only had pro_forma/disclaimer. */
const CORE_EXPERIENCE_SECTION_TYPES = EXPERIENCE_SECTION_TYPES.filter(
  (t) => t !== "pro_forma" && t !== "disclaimer"
);

function synthesizeExperienceDefaults(
  masterTemplates?: ExperienceMasterTemplate[] | null
): ExperienceSectionSnapshot[] {
  return EXPERIENCE_SECTION_TYPES.map((sectionType, i) => {
    const defaults = getExperienceDefaultFromMaster(sectionType, masterTemplates);
    if (!defaults) return null;
    return {
      ...defaults,
      visible: sectionType !== "disclaimer",
      sortOrder: i + 1,
    };
  }).filter((s): s is ExperienceSectionSnapshot => s !== null);
}

export function resolveExperienceSections(
  payload: ProposalSnapshotPayload | null,
  masterTemplates?: ExperienceMasterTemplate[] | null
): ExperienceSectionSnapshot[] {
  const fromPayload = payload?.sections ?? [];

  const hasCoreExperienceSections = fromPayload.some((s) =>
    CORE_EXPERIENCE_SECTION_TYPES.includes(
      s.sectionType as (typeof CORE_EXPERIENCE_SECTION_TYPES)[number]
    )
  );

  // Pre-experience snapshots (cover, pro_forma, etc.) — render full experience defaults.
  if (!hasCoreExperienceSections) {
    return synthesizeExperienceDefaults(masterTemplates);
  }

  return EXPERIENCE_SECTION_TYPES.map((sectionType) => {
    const defaults = getExperienceDefaultFromMaster(sectionType, masterTemplates);
    if (!defaults) return null;

    const existing = fromPayload.find((s) => s.sectionType === sectionType);
    if (existing) {
      return mergeSectionWithDefaults(existing as ExperienceSectionSnapshot, defaults);
    }

    return { ...defaults, visible: false };
  })
    .filter((s): s is ExperienceSectionSnapshot => s !== null)
    .concat(
      fromPayload.filter((s) => s.sectionType === "custom_page") as ExperienceSectionSnapshot[]
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function resolveExperienceSection(
  payload: ProposalSnapshotPayload | null,
  sectionType: string,
  masterTemplates?: ExperienceMasterTemplate[] | null
): ExperienceSectionSnapshot | null {
  const sections = resolveExperienceSections(payload, masterTemplates);
  return sections.find((s) => s.sectionType === sectionType) ?? null;
}

/**
 * Build the sections stored on a published snapshot.
 *
 * The proposal working copy (`proposal_sections`) is the source of truth at
 * publish time. Master templates only fill gaps when a proposal row is missing
 * or incomplete. After publish, frozen snapshots render verbatim.
 */
export function resolvePublishedSections(
  proposalSections: Array<Partial<ExperienceSectionSnapshot> & { sectionType: string }>,
  masterTemplates?: ExperienceMasterTemplate[] | null
): ExperienceSectionSnapshot[] {
  const systemSections = EXPERIENCE_SECTION_TYPES.map((sectionType) => {
    const master = getExperienceDefaultFromMaster(sectionType, masterTemplates);
    if (!master) return null;

    const proposalSection = proposalSections.find((s) => s.sectionType === sectionType);
    if (!proposalSection) return master;

    const merged = mergeSectionWithDefaults(
      proposalSection as ExperienceSectionSnapshot,
      master
    );

    const pcb = proposalSection.contentBlocks;
    if (pcb?.navLinks != null) {
      merged.contentBlocks = {
        ...(merged.contentBlocks ?? {}),
        navLinks: sanitizeExperiencePageLinks(pcb.navLinks),
      };
    }

    return merged;
  }).filter((s): s is ExperienceSectionSnapshot => s !== null);

  const customSections = proposalSections
    .filter((s) => s.sectionType === "custom_page")
    .map((proposalSection) => {
      const master = masterTemplates?.find(
        (t) =>
          t.sectionType === "custom_page" &&
          t.pageSlug &&
          proposalSection.pageSlug &&
          t.pageSlug === proposalSection.pageSlug
      );
      const base: ExperienceSectionSnapshot = master
        ? masterToSectionSnapshot(master)
        : {
            sectionType: "custom_page",
            pageSlug: proposalSection.pageSlug ?? null,
            title: proposalSection.title ?? "Custom Page",
            bodyCopy: proposalSection.bodyCopy ?? null,
            visible: proposalSection.visible ?? true,
            sortOrder: proposalSection.sortOrder ?? 999,
            imageUrl: proposalSection.imageUrl ?? null,
            videoUrl: proposalSection.videoUrl ?? null,
            posterUrl: proposalSection.posterUrl ?? null,
            signatoryName: proposalSection.signatoryName ?? null,
            signatoryTitle: proposalSection.signatoryTitle ?? null,
            layoutVariant: proposalSection.layoutVariant ?? null,
            calloutMetricLabel: proposalSection.calloutMetricLabel ?? null,
            calloutMetricValue: proposalSection.calloutMetricValue ?? null,
            contentBlocks: proposalSection.contentBlocks ?? null,
          };

      return mergeSectionWithDefaults(proposalSection as ExperienceSectionSnapshot, base);
    });

  return [...systemSections, ...customSections].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * A snapshot is "frozen" when it was published with fully-resolved sections
 * (renderSchemaVersion >= 1). Frozen snapshots render verbatim with no live
 * master-template merge, so editing global Proposal Design never changes an
 * already-published proposal.
 */
export function isFrozenSnapshot(payload: ProposalSnapshotPayload | null): boolean {
  return (payload?.renderSchemaVersion ?? 0) >= 1;
}

/** Sections from a frozen snapshot, returned verbatim (no master merge). */
export function resolveFrozenSections(
  payload: ProposalSnapshotPayload | null
): ExperienceSectionSnapshot[] {
  return (payload?.sections ?? []) as ExperienceSectionSnapshot[];
}
