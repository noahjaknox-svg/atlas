import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import {
  getExperienceChapterSections,
  isProFormaSectionVisible,
  SECTION_TYPE_TO_SLUG,
  type ExperienceSectionType,
} from "@/lib/experience-content";

const prefetchedHrefs = new Set<string>();
const prefetchedImages = new Set<string>();
const prefetchedVideos = new Set<string>();

export function experienceHref(slug: string, pageSlug: string): string {
  return `/${slug}/experience/${pageSlug}`;
}

export function withExperienceDraftQuery(href: string, draftMode = false): string {
  if (!draftMode) return href;
  return `${href}${href.includes("?") ? "&" : "?"}draft=1`;
}

export function getExperiencePageSlugs(sections: ExperienceSectionSnapshot[]): string[] {
  const slugs: string[] = [];

  const welcome = sections.find((s) => s.sectionType === "welcome" && s.visible);
  if (welcome) slugs.push("welcome");

  for (const chapter of getExperienceChapterSections(sections)) {
    slugs.push(
      SECTION_TYPE_TO_SLUG[chapter.sectionType as ExperienceSectionType] ?? chapter.sectionType
    );
  }

  if (isProFormaSectionVisible(sections)) {
    slugs.push("pro-forma");
  }

  return slugs;
}

function appendSearchParams(href: string, search: string): string {
  const trimmed = search.replace(/^\?/, "").trim();
  if (!trimmed) return href;
  return `${href}${href.includes("?") ? "&" : "?"}${trimmed}`;
}

export function prefetchExperienceRoute(
  router: { prefetch: (href: string) => void },
  slug: string,
  pageSlug: string,
  draftMode = false,
  search = typeof window !== "undefined" ? window.location.search : ""
): void {
  const href = appendSearchParams(
    withExperienceDraftQuery(experienceHref(slug, pageSlug), draftMode),
    search
  );
  if (prefetchedHrefs.has(href)) return;
  prefetchedHrefs.add(href);
  router.prefetch(href);
}

export function prefetchAllExperienceRoutes(
  router: { prefetch: (href: string) => void },
  slug: string,
  sections: ExperienceSectionSnapshot[],
  draftMode = false,
  search = typeof window !== "undefined" ? window.location.search : ""
): void {
  for (const pageSlug of getExperiencePageSlugs(sections)) {
    prefetchExperienceRoute(router, slug, pageSlug, draftMode, search);
  }
}

export function prefetchExperienceVideo(url: string | null | undefined): void {
  if (!url || prefetchedVideos.has(url)) return;
  prefetchedVideos.add(url);

  if (typeof document === "undefined") return;

  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "video";
  link.href = url;
  document.head.appendChild(link);

  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.src = url;
}

export function prefetchExperienceMedia(
  sections: ExperienceSectionSnapshot[],
  branding?: {
    heroCloudImageUrl?: string;
    heroCloudVideoUrl?: string | null;
    logoUrl?: string | null;
  }
): void {
  const urls = new Set<string>();

  if (branding?.heroCloudImageUrl) urls.add(branding.heroCloudImageUrl);
  if (branding?.logoUrl) urls.add(branding.logoUrl);
  if (branding?.heroCloudVideoUrl) prefetchExperienceVideo(branding.heroCloudVideoUrl);

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
