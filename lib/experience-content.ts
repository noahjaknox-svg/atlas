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
  contactEmail?: string;
  contactPhone?: string;
  contactWebsite?: string;
  contactAddress?: string;
};

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

export function isExperienceNavSection(sectionType: string): boolean {
  return sectionType !== "disclaimer";
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
  const nav = getExperienceNavSections(sections);
  const first = nav[0];
  if (!first) return "welcome";
  return SECTION_TYPE_TO_SLUG[first.sectionType as ExperienceSectionType] ?? "welcome";
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
