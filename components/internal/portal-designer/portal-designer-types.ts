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
  { type: "stat" as const, label: "Stat" },
  { type: "clubEconomics" as const, label: "Club economics" },
  { type: "html" as const, label: "HTML" },
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

/**
 * Stable key for a page in the designer's lists and selection.
 *
 * Proposal pages have database ids. Master templates have none, and several custom pages
 * share the section type "custom_page", so keying by type would make them indistinguishable
 * (they couldn't be selected, and an edit would hit all of them). Custom pages fall back to
 * their web address, which is unique among them.
 */
export function designerSectionKey(
  section: Pick<DesignerSection, "id" | "sectionType" | "pageSlug">
): string {
  if (section.id) return section.id;
  if (section.sectionType === "custom_page") return `custom_page:${section.pageSlug ?? ""}`;
  return section.sectionType;
}

/**
 * Give master custom pages a stable id derived from their web address. Used wherever master
 * templates enter the designer (page load, and after a save, since the server returns them
 * without ids). Pages that already have an id keep it. The ids are designer-only: they are
 * stripped again before a save.
 */
export function withMasterSectionIds(sections: DesignerSection[]): DesignerSection[] {
  return sections.map((s) =>
    s.sectionType === "custom_page" && !s.id ? { ...s, id: designerSectionKey(s) } : s
  );
}

/** Master templates carry no ids in storage; drop the designer-only ones before saving. */
export function withoutDesignerIds(sections: DesignerSection[]): Omit<DesignerSection, "id">[] {
  return sections.map((s) => {
    const { id: _id, ...rest } = s;
    return rest;
  });
}

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
