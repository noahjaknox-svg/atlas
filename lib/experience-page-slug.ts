import type { ExperienceSectionSnapshot } from "./experience-content";
import { SECTION_TYPE_TO_SLUG, SLUG_TO_SECTION_TYPE } from "./experience-content";

export const RESERVED_PAGE_SLUGS = new Set([
  "welcome",
  "about-us",
  "about",
  "aircraft-management",
  "aircraft-charter",
  "maintenance",
  "sales-acquisitions",
  "conformity",
  "pro-forma",
  "pro-forma",
  "disclaimer",
  "experience",
  "aircraft",
  "fleet",
  "contact",
  "services",
  "home",
  "deck",
  "api",
  "auth",
  "login",
]);

export function normalizePageSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function slugifyPageTitle(title: string): string {
  const slug = normalizePageSlug(title);
  return slug.length >= 3 ? slug : "custom-page";
}

export function validatePageSlug(slug: string): string | null {
  const normalized = normalizePageSlug(slug);
  if (normalized.length < 3) return "Slug must be at least 3 characters";
  if (normalized.length > 48) return "Slug must be 48 characters or less";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    return "Use lowercase letters, numbers, and hyphens only";
  }
  if (RESERVED_PAGE_SLUGS.has(normalized)) return "This URL slug is reserved";
  if (SLUG_TO_SECTION_TYPE[normalized]) return "This URL slug conflicts with a system page";
  return null;
}

export function sectionNavSlug(section: Pick<ExperienceSectionSnapshot, "sectionType" | "pageSlug">): string {
  if (section.pageSlug?.trim()) return normalizePageSlug(section.pageSlug);
  const mapped = SECTION_TYPE_TO_SLUG[section.sectionType as keyof typeof SECTION_TYPE_TO_SLUG];
  if (mapped) return mapped;
  return normalizePageSlug(section.sectionType);
}

export function resolveSectionByPageSlug(
  sections: ExperienceSectionSnapshot[],
  pageSlug: string
): ExperienceSectionSnapshot | undefined {
  const normalized = normalizePageSlug(pageSlug);
  const byCustom = sections.find(
    (s) => s.sectionType === "custom_page" && s.pageSlug && normalizePageSlug(s.pageSlug) === normalized
  );
  if (byCustom) return byCustom;

  const sectionType = SLUG_TO_SECTION_TYPE[normalized];
  if (!sectionType) return undefined;
  return sections.find((s) => s.sectionType === sectionType);
}

export function isCustomPortalPage(section: Pick<ExperienceSectionSnapshot, "sectionType">): boolean {
  return section.sectionType === "custom_page";
}

export function sectionDisplayLabel(section: Pick<ExperienceSectionSnapshot, "sectionType" | "title" | "pageSlug">): string {
  if (isCustomPortalPage(section)) return section.title;
  return section.title;
}
