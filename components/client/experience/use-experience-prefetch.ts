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

export function useExperiencePrefetch(
  slug: string,
  sections: ExperienceSectionSnapshot[],
  branding: { heroCloudImageUrl: string; logoUrl?: string | null }
): void {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    prefetchAllExperienceRoutes(router, slug, sections);
    prefetchExperienceMedia(sections, branding);
  }, [router, slug, sections, branding]);

  useEffect(() => {
    const slugs = getExperiencePageSlugs(sections);
    const match = pathname?.match(/\/experience\/([^/?]+)/);
    const current = match?.[1];
    if (!current) return;

    const index = slugs.indexOf(current);
    if (index < 0) return;

    if (index > 0) prefetchExperienceRoute(router, slug, slugs[index - 1]!);
    if (index < slugs.length - 1) prefetchExperienceRoute(router, slug, slugs[index + 1]!);
  }, [pathname, router, slug, sections]);
}
