import type { ExperienceContentBlocks, ExperienceSectionSnapshot } from "./experience-content";
import {
  EXPERIENCE_SECTION_TYPES,
  mergeSectionWithDefaults,
  sanitizeExperiencePageLinks,
} from "./experience-content";
import { getExperienceDefaultFromMaster } from "./experience-master";
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
  }).filter((s): s is ExperienceSectionSnapshot => s !== null);
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
 * Ownership split (the redesign's core rule):
 *   - Structure, media, layout, and rich content blocks come from the master
 *     templates (the global Deck Builder / Proposal Design).
 *   - Copy, page selection (visible), order, and signatory come from the proposal.
 *   - The only per-proposal content-block override preserved is the aircraft
 *     market link, which is genuinely proposal-specific.
 *
 * Editing global Deck Builder art therefore flows into a proposal on its next
 * republish, while each proposal keeps its own copy and chosen pages.
 */
export function resolvePublishedSections(
  proposalSections: Array<Partial<ExperienceSectionSnapshot> & { sectionType: string }>,
  masterTemplates?: ExperienceMasterTemplate[] | null
): ExperienceSectionSnapshot[] {
  return EXPERIENCE_SECTION_TYPES.map((sectionType) => {
    const master = getExperienceDefaultFromMaster(sectionType, masterTemplates);
    if (!master) return null;

    const proposalSection = proposalSections.find((s) => s.sectionType === sectionType);
    if (!proposalSection) return master;

    const marketOverrides: Partial<ExperienceContentBlocks> = {};
    const pcb = proposalSection.contentBlocks;
    if (pcb?.aircraftMarketUrl != null) marketOverrides.aircraftMarketUrl = pcb.aircraftMarketUrl;
    if (pcb?.aircraftMarketButtonLabel != null) {
      marketOverrides.aircraftMarketButtonLabel = pcb.aircraftMarketButtonLabel;
    }
    if (pcb?.navLinks != null) {
      marketOverrides.navLinks = sanitizeExperiencePageLinks(pcb.navLinks);
    }

    return {
      ...master,
      title: proposalSection.title ?? master.title,
      bodyCopy: proposalSection.bodyCopy ?? master.bodyCopy,
      visible: proposalSection.visible ?? master.visible,
      sortOrder: proposalSection.sortOrder ?? master.sortOrder,
      signatoryName: proposalSection.signatoryName ?? master.signatoryName,
      signatoryTitle: proposalSection.signatoryTitle ?? master.signatoryTitle,
      contentBlocks:
        Object.keys(marketOverrides).length > 0
          ? { ...(master.contentBlocks ?? {}), ...marketOverrides }
          : master.contentBlocks,
    };
  }).filter((s): s is ExperienceSectionSnapshot => s !== null);
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
