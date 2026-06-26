/** Client-safe experience section types and route mapping. */

export const EXPERIENCE_SECTION_TYPES = [
  "welcome",
  "about_us",
  "aircraft_management",
  "aircraft_charter",
  "maintenance",
  "sales_acquisitions",
  "conformity_process",
  "pro_forma",
  "disclaimer",
] as const;

export type ExperienceSectionType = (typeof EXPERIENCE_SECTION_TYPES)[number];

/**
 * Bumped whenever the published-snapshot section shape or resolution logic changes.
 * Snapshots that store this are rendered verbatim (frozen) on the client portal, so
 * global Proposal Design edits never alter an already-published proposal. Older
 * snapshots without it fall back to live master-template merging for compatibility.
 */
export const RENDER_SCHEMA_VERSION = 2;

/** Client portal uses the v2 presentation shell (prism stage, glass nav, bottom dock). */
export function isExperienceRenderV2(renderSchemaVersion?: number): boolean {
  return (renderSchemaVersion ?? 0) >= 2;
}

/** Global deck-template generation captured on each published snapshot. */
export const DECK_VERSION = 1;

/** URL slug under /[portal]/experience/[page] */
export const SECTION_TYPE_TO_SLUG: Record<ExperienceSectionType, string> = {
  welcome: "welcome",
  about_us: "about-us",
  aircraft_management: "aircraft-management",
  aircraft_charter: "aircraft-charter",
  maintenance: "maintenance",
  sales_acquisitions: "sales-acquisitions",
  conformity_process: "conformity",
  pro_forma: "pro-forma",
  disclaimer: "disclaimer",
};

export const SLUG_TO_SECTION_TYPE: Record<string, ExperienceSectionType> = Object.fromEntries(
  Object.entries(SECTION_TYPE_TO_SLUG).map(([type, slug]) => [slug, type as ExperienceSectionType])
) as Record<string, ExperienceSectionType>;

export const EXPERIENCE_TAB_LABELS: Record<ExperienceSectionType, string> = {
  welcome: "Welcome",
  about_us: "About Us",
  aircraft_management: "Aircraft Management",
  aircraft_charter: "Aircraft Charter",
  maintenance: "Maintenance",
  sales_acquisitions: "Sales & Acquisitions",
  conformity_process: "Conformity Process",
  pro_forma: "Pro Forma",
  disclaimer: "Disclaimer",
};

export type ExperiencePillar = {
  title: string;
  body: string;
  icon?: string;
};

export type ExperienceTimelinePhase = {
  phase: string;
  window: string;
  ownerActions: string[];
  prismjetActions: string[];
};

export type ExperienceChecklistItem = {
  label: string;
};

export type ExperienceComparisonRow = {
  item: string;
  otherCost: string;
  prismjetNote: string;
};

export type ExperienceQuote = {
  text: string;
  attribution?: string;
};

export type ExperienceCallout = {
  label: string;
  value: string;
};

export type ExperienceServiceTile = {
  title: string;
  description?: string;
};

export type ExperienceExplainerCard = {
  title: string;
  body: string;
};

export type ExperienceGalleryItem = {
  url: string;
  caption?: string;
};

export type ExperiencePageLink = {
  label: string;
  url: string;
};

export type ExperienceContentBlocks = {
  pillars?: ExperiencePillar[];
  timeline?: ExperienceTimelinePhase[];
  checklist?: ExperienceChecklistItem[];
  comparisonRows?: ExperienceComparisonRow[];
  quote?: ExperienceQuote;
  callout?: ExperienceCallout;
  introBullets?: string[];
  goalBullets?: string[];
  recordsIssues?: string[];
  ownerRecommendations?: string[];
  downtimeStrategies?: string[];
  explainerCards?: ExperienceExplainerCard[];
  serviceTiles?: ExperienceServiceTile[];
  /** Photo gallery rendered on the page body (uploaded via the design editor). */
  gallery?: ExperienceGalleryItem[];
  /** Custom buttons in the portal nav (Edit presentation → Nav menu buttons). */
  navLinks?: ExperiencePageLink[];
  contactEmail?: string;
  contactPhone?: string;
  contactWebsite?: string;
  contactAddress?: string;
  /** External link shown in portal header (Edit presentation → Portal links). */
  aircraftMarketUrl?: string | null;
  aircraftMarketButtonLabel?: string | null;
};

export type ExperienceNavLink = ExperiencePageLink;

export type ExperienceSectionSnapshot = {
  sectionType: string;
  title: string;
  bodyCopy: string | null;
  visible: boolean;
  sortOrder: number;
  imageUrl: string | null;
  videoUrl: string | null;
  posterUrl: string | null;
  calloutMetricLabel: string | null;
  calloutMetricValue: string | null;
  layoutVariant: string | null;
  contentBlocks: ExperienceContentBlocks | null;
  signatoryName: string | null;
  signatoryTitle: string | null;
};

/** Normalize raw link-button input into clean, renderable entries. */
export function sanitizeExperiencePageLinks(value: unknown): ExperiencePageLink[] {
  if (!Array.isArray(value)) return [];
  const cleaned: ExperiencePageLink[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const label =
      typeof (item as ExperiencePageLink).label === "string"
        ? (item as ExperiencePageLink).label.trim()
        : "";
    const url =
      typeof (item as ExperiencePageLink).url === "string"
        ? (item as ExperiencePageLink).url.trim()
        : "";
    if (!label || !url) continue;
    cleaned.push({ label, url });
  }
  return cleaned;
}

const DEFAULT_NAV_LINK_LABEL = "Available aircraft";

/** Nav menu buttons for the portal header (supports legacy single market link). */
export function resolvePortalNavLinks(
  blocks: ExperienceContentBlocks | null | undefined
): ExperiencePageLink[] {
  const navLinks = sanitizeExperiencePageLinks(blocks?.navLinks);
  if (navLinks.length > 0) return navLinks;

  const legacyUrl = blocks?.aircraftMarketUrl?.trim();
  if (!legacyUrl) return [];

  return [
    {
      label: blocks?.aircraftMarketButtonLabel?.trim() || DEFAULT_NAV_LINK_LABEL,
      url: legacyUrl,
    },
  ];
}

export function isExperienceNavSection(sectionType: string): boolean {
  return sectionType !== "disclaimer" && sectionType !== "pro_forma";
}

/** Visible story chapters (not welcome, pro forma, or disclaimer). */
export function getExperienceChapterSections(
  sections: ExperienceSectionSnapshot[]
): ExperienceSectionSnapshot[] {
  return sections
    .filter(
      (s) =>
        s.visible &&
        s.sectionType !== "disclaimer" &&
        s.sectionType !== "pro_forma" &&
        s.sectionType !== "welcome"
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function isProFormaSectionVisible(sections: ExperienceSectionSnapshot[]): boolean {
  return sections.some((s) => s.sectionType === "pro_forma" && s.visible);
}

export function getExperienceNavSections(
  sections: ExperienceSectionSnapshot[]
): ExperienceSectionSnapshot[] {
  return sections
    .filter((s) => s.visible && isExperienceNavSection(s.sectionType))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getSectionBySlug(
  sections: ExperienceSectionSnapshot[],
  pageSlug: string
): ExperienceSectionSnapshot | undefined {
  const sectionType = SLUG_TO_SECTION_TYPE[pageSlug];
  if (!sectionType) return undefined;
  return sections.find((s) => s.sectionType === sectionType);
}

export function getFirstExperienceSlug(sections: ExperienceSectionSnapshot[]): string {
  const welcome = sections.find((s) => s.sectionType === "welcome" && s.visible);
  if (welcome) return "welcome";

  const chapters = getExperienceChapterSections(sections);
  if (chapters[0]) {
    return (
      SECTION_TYPE_TO_SLUG[chapters[0].sectionType as ExperienceSectionType] ??
      chapters[0].sectionType
    );
  }

  if (isProFormaSectionVisible(sections)) return "pro-forma";

  return "welcome";
}

/** Logo / home target: welcome when on, otherwise the first page clients would see. */
export function getExperienceHomeSlug(sections: ExperienceSectionSnapshot[]): string {
  const welcome = sections.find((s) => s.sectionType === "welcome" && s.visible);
  if (welcome) return "welcome";
  return getFirstExperienceSlug(sections);
}

export function mergeSectionWithDefaults(
  section: Partial<ExperienceSectionSnapshot> & { sectionType: string },
  defaults: ExperienceSectionSnapshot
): ExperienceSectionSnapshot {
  return {
    ...defaults,
    ...section,
    contentBlocks: {
      ...(defaults.contentBlocks ?? {}),
      ...(section.contentBlocks ?? {}),
    },
  };
}
