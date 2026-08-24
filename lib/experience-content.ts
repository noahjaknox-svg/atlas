import { resolveSectionByPageSlug, sectionNavSlug } from "./experience-page-slug";
import type { ProposalImageVariant } from "./experience-image-system";
import type { BlockVisibility } from "./portal-layout-settings";
import type {
  BLOCK_ALIGNS,
  BLOCK_PADDINGS,
  BLOCK_VERTICAL_ALIGNS,
  BLOCK_WIDTHS,
  CONTAINER_CELL_ALIGNS,
  CTA_VARIANTS,
  EXPERIENCE_GALLERY_LAYOUTS,
  IMAGE_DISPLAY_SIZES,
  ROW_DISPLAYS,
  ROW_GAPS,
  ROW_PRESETS,
} from "./experience-block-enums";

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
export const RENDER_SCHEMA_VERSION = 3;

/** Snapshots at v3+ freeze fleet showcase and extended portal branding on publish. */
export function isSnapshotFleetFrozen(renderSchemaVersion?: number): boolean {
  return (renderSchemaVersion ?? 0) >= 3;
}

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

export type ExperienceGalleryLayout = (typeof EXPERIENCE_GALLERY_LAYOUTS)[number];

export type BlockWidth = (typeof BLOCK_WIDTHS)[number];
export type BlockAlign = (typeof BLOCK_ALIGNS)[number];
export type BlockVerticalAlign = (typeof BLOCK_VERTICAL_ALIGNS)[number];
export type BlockPadding = (typeof BLOCK_PADDINGS)[number];
export type RowPreset = (typeof ROW_PRESETS)[number];
export type RowGap = (typeof ROW_GAPS)[number];

export type RowDisplay = (typeof ROW_DISPLAYS)[number];

export type GridDimension = 1 | 2 | 3 | 4;

export type ContainerCellAlign = (typeof CONTAINER_CELL_ALIGNS)[number];
export type CtaVariant = (typeof CTA_VARIANTS)[number];

export type BlockLayout = {
  /** @deprecated use widthDesktop / widthMobile preset ids */
  width?: BlockWidth;
  widthDesktop?: string;
  widthMobile?: string;
  visibility?: BlockVisibility;
  /** Horizontal alignment within the column or page content area. */
  align?: BlockAlign;
  /** Vertical alignment within a grid cell (when the cell is taller than the block). */
  verticalAlign?: BlockVerticalAlign;
  padding?: BlockPadding;
};

type LeafBlockBase = { id: string; blockLayout?: BlockLayout };

export type ImageFocalPoint = { x: number; y: number };
export type ImageCropRect = { x: number; y: number; width: number; height: number };
export type ImageDisplaySize = (typeof IMAGE_DISPLAY_SIZES)[number];

export type ExperiencePageBlock =
  | (LeafBlockBase & { type: "text"; markdown: string })
  | (LeafBlockBase & { type: "heading"; level: 1 | 2 | 3; text: string })
  | (LeafBlockBase & {
      type: "image";
      url: string;
      alt?: string;
      caption?: string;
      /** @deprecated Portal designer uses imageSize; kept for galleries and legacy pages. */
      variant?: ProposalImageVariant;
      imageSize?: ImageDisplaySize;
      /** Width/height of cropped region (pixels); set when saving crop in designer. */
      cropAspectRatio?: number;
      focalPoint?: ImageFocalPoint;
      crop?: ImageCropRect;
    })
  | (LeafBlockBase & {
      type: "gallery";
      layout?: ExperienceGalleryLayout;
      items: ExperienceGalleryItem[];
    })
  | (LeafBlockBase & { type: "html"; html: string })
  | (LeafBlockBase & { type: "spacer"; size?: RowGap })
  | (LeafBlockBase & { type: "quote"; text: string; attribution?: string })
  | (LeafBlockBase & {
      type: "cta";
      label: string;
      url: string;
      variant?: CtaVariant;
    })
  | (LeafBlockBase & {
      type: "video";
      url: string;
      posterUrl?: string;
      caption?: string;
    })
  | {
      id: string;
      type: "row";
      preset: RowPreset;
      gap?: RowGap;
      /** Side-by-side columns vs stacked rows on wide viewports. Defaults to columns. */
      display?: RowDisplay;
      /** Relative column widths (e.g. [2, 1, 1] → 2fr 1fr 1fr). Defaults from preset when omitted. */
      columnWeights?: number[];
      blockLayout?: BlockLayout;
      /** Give each column a subtle card treatment (background, rounded corners, padding)
       * so a grid of distinct items reads as a grid instead of stacked prose. Off by default. */
      cellCardStyle?: boolean;
      columns: ExperiencePageBlock[][];
    }
  | {
      id: string;
      type: "container";
      rows: GridDimension;
      cols: GridDimension;
      gap?: RowGap;
      columnWeights?: number[];
      rowWeights?: number[];
      /** @deprecated use blockLayout width presets */
      width?: BlockWidth;
      /** @deprecated use blockLayout.align */
      align?: BlockAlign;
      blockLayout?: BlockLayout;
      cellAlign?: ContainerCellAlign;
      /** Give each cell a subtle card treatment (background, rounded corners, padding)
       * so a grid of distinct items reads as a grid instead of stacked prose. Off by default. */
      cellCardStyle?: boolean;
      cells: ExperiencePageBlock[][][];
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
  /** Optional freeform block stack — when present, generic renderer is used. */
  pageBlocks?: ExperiencePageBlock[];
};

export type ExperienceNavLink = ExperiencePageLink;

export type ExperienceSectionSnapshot = {
  sectionType: string;
  pageSlug?: string | null;
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
  /** Which usage types this page applies to — missing/empty means all. */
  usageTypeIds?: string[];
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
  return resolveSectionByPageSlug(sections, pageSlug);
}

export function getFirstExperienceSlug(sections: ExperienceSectionSnapshot[]): string {
  const welcome = sections.find((s) => s.sectionType === "welcome" && s.visible);
  if (welcome) return "welcome";

  const chapters = getExperienceChapterSections(sections);
  if (chapters[0]) return sectionNavSlug(chapters[0]);

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
