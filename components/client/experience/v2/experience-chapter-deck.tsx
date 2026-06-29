"use client";

import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useExperienceBootstrap } from "./experience-bootstrap-context";
import { ExperienceChapterSlide } from "./experience-chapter-slide";

const deckSpring = {
  type: "spring" as const,
  stiffness: 280,
  damping: 32,
  mass: 0.85,
};

export function ExperienceChapterDeck() {
  const reducedMotion = useReducedMotion();
  const {
    activeSlug,
    slideIndex,
    pageSlugs,
    mountedSlugs,
    markSlugVisited,
    onTransitionComplete,
    isTransitioning,
  } = useExperienceBootstrap();

  useEffect(() => {
    markSlugVisited(activeSlug);
  }, [activeSlug, markSlugVisited]);

  const slideCount = pageSlugs.length;
  const trackWidth = slideCount > 0 ? `${slideCount * 100}%` : "100%";
  const slideWidth = slideCount > 0 ? `${100 / slideCount}%` : "100%";
  const offset = slideCount > 0 ? `${(slideIndex * 100) / slideCount}%` : "0%";

  return (
    <div className="relative h-full min-h-0 w-full overflow-x-hidden overflow-y-hidden">
      <motion.div
        className="flex h-full items-stretch"
        style={{ width: trackWidth }}
        animate={{ x: `-${offset}` }}
        transition={reducedMotion ? { duration: 0.12 } : deckSpring}
        onAnimationComplete={() => {
          if (isTransitioning) onTransitionComplete();
        }}
      >
        {pageSlugs.map((pageSlug) => {
          const visited = mountedSlugs.has(pageSlug);
          const isActive = pageSlug === activeSlug;

          return (
            <div
              key={pageSlug}
              className={cn(
                "h-full min-h-0 shrink-0",
                pageSlug === "pro-forma" ? "overflow-hidden" : "overflow-y-auto overscroll-y-contain"
              )}
              style={{ width: slideWidth }}
            >
              {visited ? (
                <ExperienceChapterSlide pageSlug={pageSlug} isActive={isActive} />
              ) : null}
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
