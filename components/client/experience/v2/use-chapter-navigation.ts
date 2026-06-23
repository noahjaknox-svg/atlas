"use client";

import { useCallback, useContext, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  SECTION_TYPE_TO_SLUG,
  type ExperienceSectionSnapshot,
  type ExperienceSectionType,
} from "@/lib/experience-content";
import {
  experienceHref,
  getExperiencePageSlugs,
} from "@/lib/prefetch-experience-routes";
import { ExperienceBootstrapContext } from "./experience-bootstrap-context";

export function useChapterNavigation({
  slug,
  sections,
  draftMode = false,
}: {
  slug: string;
  sections: ExperienceSectionSnapshot[];
  draftMode?: boolean;
}) {
  const deck = useContext(ExperienceBootstrapContext);
  const pathname = usePathname();
  const router = useRouter();

  const withDraft = useCallback(
    (href: string) => (draftMode ? `${href}${href.includes("?") ? "&" : "?"}draft=1` : href),
    [draftMode]
  );

  const pageSlugs = useMemo(() => getExperiencePageSlugs(sections), [sections]);

  const pathnameSlug = useMemo(() => {
    const match = pathname?.match(/\/experience\/([^/?]+)/);
    return match?.[1] ?? null;
  }, [pathname]);

  const currentSlug = deck?.activeSlug ?? pathnameSlug;

  const slideIndex = useMemo(() => {
    if (deck) return deck.slideIndex;
    if (!currentSlug) return 0;
    const index = pageSlugs.indexOf(currentSlug);
    return index >= 0 ? index : 0;
  }, [currentSlug, deck, pageSlugs]);

  const slideProgress = useMemo(() => {
    if (pageSlugs.length <= 1) return 0;
    return slideIndex / (pageSlugs.length - 1);
  }, [slideIndex, pageSlugs]);

  const goToAdjacentSlide = useCallback(
    (delta: number) => {
      if (deck) {
        deck.goToAdjacentSlide(delta);
        return;
      }
      if (!currentSlug) return;
      const index = pageSlugs.indexOf(currentSlug);
      if (index < 0) return;
      const next = pageSlugs[index + delta];
      if (!next) return;
      router.push(withDraft(experienceHref(slug, next)), { scroll: false });
    },
    [currentSlug, deck, pageSlugs, router, slug, withDraft]
  );

  useEffect(() => {
    if (deck) return;

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
  }, [deck, goToAdjacentSlide]);

  function tabHref(sectionType: string) {
    const pageSlug = SECTION_TYPE_TO_SLUG[sectionType as ExperienceSectionType] ?? sectionType;
    return withDraft(experienceHref(slug, pageSlug));
  }

  function isActive(sectionType: string) {
    if (deck) return deck.isActive(sectionType);
    const pageSlug = SECTION_TYPE_TO_SLUG[sectionType as ExperienceSectionType] ?? sectionType;
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
    navigate: deck?.navigate,
  };
}
