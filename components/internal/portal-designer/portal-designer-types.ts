import type {
  ExperienceSectionSnapshot,
} from "@/lib/experience-content";
import { getSectionPageBlocks, patchSectionPageBlocks } from "@/lib/page-blocks-utils";

/** Unified section shape for master templates and proposal working copies. */
export type DesignerSection = ExperienceSectionSnapshot & {
  id?: string;
};

export type PortalDesignerMode = "master" | "proposal";

export type PreviewViewport = "desktop" | "mobile";

export type PreviewSource = "draft" | "published";

export type PortalDesignerHeroState = {
  clientSummary: string;
  portalImageUrl: string;
  portalVideoUrl: string;
  portalSpecHighlights: string[];
};

export const DESIGNER_BLOCK_TYPES = [
  { type: "text" as const, label: "Text" },
  { type: "heading" as const, label: "Heading" },
  { type: "image" as const, label: "Image" },
  { type: "gallery" as const, label: "Gallery" },
  { type: "container" as const, label: "Container" },
  { type: "quote" as const, label: "Quote" },
  { type: "cta" as const, label: "Button" },
  { type: "video" as const, label: "Video" },
  { type: "html" as const, label: "Custom HTML" },
  { type: "spacer" as const, label: "Spacer" },
];

/** Pages editable in the designer (disclaimer is footer-only). */
export const DESIGNER_PAGE_TYPES = [
  "welcome",
  "about_us",
  "aircraft_management",
  "aircraft_charter",
  "maintenance",
  "sales_acquisitions",
  "conformity_process",
  "pro_forma",
] as const;

export type DesignerPageType = (typeof DESIGNER_PAGE_TYPES)[number];

export function isDesignerPageType(value: string): value is DesignerPageType {
  return (DESIGNER_PAGE_TYPES as readonly string[]).includes(value);
}

export type DesignerBrandingTab = "pages" | "global";

export function cloneDesignerSections(sections: DesignerSection[]): DesignerSection[] {
  return JSON.parse(JSON.stringify(sections)) as DesignerSection[];
}

export function sectionsWithPageBlocks(sections: DesignerSection[]): DesignerSection[] {
  return sections.map((section) => {
    if (section.contentBlocks?.pageBlocks != null) return section;
    const pageBlocks = getSectionPageBlocks(section);
    if (pageBlocks.length === 0) return section;
    return {
      ...section,
      contentBlocks: patchSectionPageBlocks(section.contentBlocks, pageBlocks),
    };
  });
}
