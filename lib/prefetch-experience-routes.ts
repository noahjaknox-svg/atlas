import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import {
  getExperienceNavSections,
  SECTION_TYPE_TO_SLUG,
  type ExperienceSectionType,
} from "@/lib/experience-content";

const prefetchedHrefs = new Set<string>();
const prefetchedImages = new Set<string>();

export function experienceHref(slug: string, pageSlug: string): string {
  return `/${slug}/experience/${pageSlug}`;
}

export function getExperiencePageSlugs(sections: ExperienceSectionSnapshot[]): string[] {
  const nav = getExperienceNavSections(sections);
  const slugs = nav.map(
    (s) => SECTION_TYPE_TO_SLUG[s.sectionType as ExperienceSectionType] ?? s.sectionType
  );
  if (!slugs.includes("pro-forma")) {
    slugs.push("pro-forma");
  }
  return slugs;
}

export function prefetchExperienceRoute(
  router: { prefetch: (href: string) => void },
  slug: string,
  pageSlug: string
): void {
  const href = experienceHref(slug, pageSlug);
  if (prefetchedHrefs.has(href)) return;
  prefetchedHrefs.add(href);
  router.prefetch(href);
}

export function prefetchAllExperienceRoutes(
  router: { prefetch: (href: string) => void },
  slug: string,
  sections: ExperienceSectionSnapshot[]
): void {
  for (const pageSlug of getExperiencePageSlugs(sections)) {
    prefetchExperienceRoute(router, slug, pageSlug);
  }
}

export function prefetchExperienceMedia(
  sections: ExperienceSectionSnapshot[],
  branding?: { heroCloudImageUrl?: string; logoUrl?: string | null }
): void {
  const urls = new Set<string>();

  if (branding?.heroCloudImageUrl) urls.add(branding.heroCloudImageUrl);
  if (branding?.logoUrl) urls.add(branding.logoUrl);

  for (const section of sections) {
    if (section.imageUrl) urls.add(section.imageUrl);
    if (section.posterUrl) urls.add(section.posterUrl);
    for (const item of section.contentBlocks?.gallery ?? []) {
      if (item.url && !/\.(mp4|webm)(\?|$)/i.test(item.url)) {
        urls.add(item.url);
      }
    }
  }

  for (const url of Array.from(urls)) {
    if (prefetchedImages.has(url)) continue;
    prefetchedImages.add(url);
    const img = new Image();
    img.src = url;
  }
}
