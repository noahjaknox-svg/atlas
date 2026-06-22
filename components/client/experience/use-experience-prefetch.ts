"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ExperienceSectionSnapshot } from "@/lib/experience-content";
import {
  getExperiencePageSlugs,
  prefetchAllExperienceRoutes,
  prefetchExperienceMedia,
  prefetchExperienceRoute,
} from "@/lib/prefetch-experience-routes";

/** Warm all experience routes + media so chapter navigation feels instant. */
export function useExperiencePrefetch(
  slug: string,
  sections: ExperienceSectionSnapshot[],
  branding: {
    heroCloudImageUrl: string;
    heroCloudVideoUrl?: string | null;
    logoUrl?: string | null;
  },
  draftMode = false
): void {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    prefetchAllExperienceRoutes(router, slug, sections, draftMode);
    prefetchExperienceMedia(sections, branding);
    router.prefetch(`/${slug}/aircraft`);
  }, [router, slug, sections, branding, draftMode]);

  useEffect(() => {
    const slugs = getExperiencePageSlugs(sections);
    for (const pageSlug of slugs) {
      prefetchExperienceRoute(router, slug, pageSlug, draftMode);
    }
  }, [pathname, router, slug, sections, draftMode]);
}

/** Call from nav links on hover/focus to warm a single chapter ahead of click. */
export function usePrefetchExperienceChapter(
  slug: string,
  draftMode = false
): (pageSlug: string) => void {
  const router = useRouter();
  return (pageSlug: string) => {
    prefetchExperienceRoute(router, slug, pageSlug, draftMode);
  };
}
