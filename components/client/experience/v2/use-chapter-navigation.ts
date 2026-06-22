"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  SECTION_TYPE_TO_SLUG,
  type ExperienceSectionSnapshot,
} from "@/lib/experience-content";
import {
  experienceHref,
  getExperiencePageSlugs,
} from "@/lib/prefetch-experience-routes";

export function useChapterNavigation({
  slug,
  sections,
  draftMode = false,
}: {
  slug: string;
  sections: ExperienceSectionSnapshot[];
  draftMode?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const withDraft = useCallback(
    (href: string) => (draftMode ? `${href}${href.includes("?") ? "&" : "?"}draft=1` : href),
    [draftMode]
  );

  const pageSlugs = useMemo(() => getExperiencePageSlugs(sections), [sections]);

  const currentSlug = useMemo(() => {
    const match = pathname?.match(/\/experience\/([^/?]+)/);
    return match?.[1] ?? null;
  }, [pathname]);

  const slideIndex = useMemo(() => {
    if (!currentSlug) return 0;
    const index = pageSlugs.indexOf(currentSlug);
    return index >= 0 ? index : 0;
  }, [currentSlug, pageSlugs]);

  const slideProgress = useMemo(() => {
    if (pageSlugs.length <= 1) return 0;
    return slideIndex / (pageSlugs.length - 1);
  }, [slideIndex, pageSlugs]);

  const goToAdjacentSlide = useCallback(
    (delta: number) => {
      if (!currentSlug) return;
      const index = pageSlugs.indexOf(currentSlug);
      if (index < 0) return;
      const next = pageSlugs[index + delta];
      if (!next) return;
      router.push(withDraft(experienceHref(slug, next)), { scroll: false });
    },
    [currentSlug, pageSlugs, router, slug, withDraft]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowRight") goToAdjacentSlide(1);
      if (e.key === "ArrowLeft") goToAdjacentSlide(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goToAdjacentSlide]);

  function tabHref(sectionType: string) {
    const pageSlug = SECTION_TYPE_TO_SLUG[sectionType as keyof typeof SECTION_TYPE_TO_SLUG];
    return withDraft(experienceHref(slug, pageSlug));
  }

  function isActive(sectionType: string) {
    const pageSlug = SECTION_TYPE_TO_SLUG[sectionType as keyof typeof SECTION_TYPE_TO_SLUG];
    return currentSlug === pageSlug;
  }

  return {
    pageSlugs,
    currentSlug,
    slideIndex,
    slideProgress,
    goToAdjacentSlide,
    tabHref,
    isActive,
    withDraft,
  };
}
