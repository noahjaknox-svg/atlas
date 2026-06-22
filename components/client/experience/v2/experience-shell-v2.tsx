"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "./motion-lite";
import { cn } from "@/lib/utils";
import { CloudBackground } from "@/components/client/cloud-background";
import { experienceHref } from "@/lib/prefetch-experience-routes";
import { DEFAULT_LOGO } from "@/lib/portal-constants";
import {
  EXPERIENCE_TAB_LABELS,
  SECTION_TYPE_TO_SLUG,
  type ExperienceSectionSnapshot,
  type ExperienceSectionType,
  getExperienceNavSections,
} from "@/lib/experience-content";
import { useExperiencePrefetch, usePrefetchExperienceChapter } from "../use-experience-prefetch";
import { ChapterTransition } from "./chapter-transition";
import { useChapterNavigation } from "./use-chapter-navigation";
import { experienceDockV2, experienceNavPillV2 } from "./experience-tokens";

const MOBILE_SHORT_LABELS: Record<string, string> = {
  welcome: "Welcome",
  about_us: "About",
  aircraft_management: "Management",
  aircraft_charter: "Charter",
  maintenance: "Maintenance",
  sales_acquisitions: "Sales",
  conformity_process: "Conformity",
};

export function ExperienceShellV2({
  slug,
  sections,
  children,
  logoUrl,
  clientDisplayName,
  disclaimer,
  branding,
  draftMode = false,
}: {
  slug: string;
  sections: ExperienceSectionSnapshot[];
  children: React.ReactNode;
  logoUrl?: string;
  clientDisplayName?: string;
  disclaimer?: string | null;
  branding: { heroCloudImageUrl: string; heroCloudVideoUrl: string | null; logoUrl?: string | null };
  draftMode?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const [navDirection, setNavDirection] = useState(0);
  const prevIndexRef = useRef(0);

  const {
    slideIndex,
    goToAdjacentSlide,
    tabHref,
    isActive,
    withDraft,
  } = useChapterNavigation({ slug, sections, draftMode });

  const prefetchChapter = usePrefetchExperienceChapter(slug, draftMode);

  useExperiencePrefetch(slug, sections, branding, draftMode);

  useEffect(() => {
    if (slideIndex !== prevIndexRef.current) {
      setNavDirection(slideIndex > prevIndexRef.current ? 1 : -1);
      prevIndexRef.current = slideIndex;
    }
  }, [slideIndex]);

  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
      document.body.style.overflow = prevBody;
    };
  }, []);

  const navSections = getExperienceNavSections(sections).filter(
    (s) => s.sectionType !== "pro_forma"
  );

  const welcome = sections.find((s) => s.sectionType === "welcome");
  const marketUrl = welcome?.contentBlocks?.aircraftMarketUrl?.trim();
  const marketLabel =
    welcome?.contentBlocks?.aircraftMarketButtonLabel?.trim() || "Available aircraft";

  const resolvedLogo = logoUrl ?? branding.logoUrl ?? DEFAULT_LOGO;

  function tabLabel(sectionType: string, title: string) {
    return (
      MOBILE_SHORT_LABELS[sectionType] ??
      EXPERIENCE_TAB_LABELS[sectionType as keyof typeof EXPERIENCE_TAB_LABELS] ??
      title
    );
  }

  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  function handleSwipeStart(e: React.TouchEvent) {
    if (reducedMotion) return;
    const t = e.touches[0];
    if (!t) return;
    swipeStart.current = { x: t.clientX, y: t.clientY };
  }

  function handleSwipeEnd(e: React.TouchEvent) {
    if (reducedMotion || !swipeStart.current) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - swipeStart.current.x;
    swipeStart.current = null;
    if (Math.abs(dx) < 60) return;
    if (dx < 0) goToAdjacentSlide(1);
    else goToAdjacentSlide(-1);
  }

  return (
    <div className="relative h-[100dvh] overflow-hidden text-white">
      <CloudBackground
        imageUrl={branding.heroCloudImageUrl}
        videoUrl={branding.heroCloudVideoUrl}
        overlay="dark"
        fixed
        priorityVideo
        kenBurns
      />
      {draftMode ? (
        <div className="fixed left-0 right-0 top-0 z-[60] bg-atlas-accent/90 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0a0d14]">
          Draft preview — not visible to the client until published
        </div>
      ) : null}

      {/* Floating chapter nav */}
      <div
        className="fixed left-0 right-0 z-50 flex justify-center px-3"
        style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <div
          className={cn(
            experienceNavPillV2,
            "flex max-w-[min(100%,72rem)] items-stretch gap-0 px-2 py-2.5 sm:gap-0 sm:px-3 sm:py-3"
          )}
        >
          <Link
            href={withDraft(experienceHref(slug, "welcome"))}
            prefetch
            scroll={false}
            className="flex shrink-0 items-center border-r border-white/10 py-1 pl-3 pr-4 sm:py-1.5 sm:pl-4 sm:pr-5"
            aria-label="PrismJet — Welcome"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolvedLogo}
              alt="PrismJet"
              className="h-10 w-auto max-w-[140px] object-contain sm:h-12 sm:max-w-[168px]"
            />
          </Link>

          <nav
            className="scrollbar-none flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-2 sm:gap-1.5 sm:px-3"
            aria-label="Chapters"
          >
            {navSections.map((s) => {
              const active = isActive(s.sectionType);
              const pageSlug =
                SECTION_TYPE_TO_SLUG[s.sectionType as ExperienceSectionType] ?? s.sectionType;
              return (
                <Link
                  key={s.sectionType}
                  href={tabHref(s.sectionType)}
                  prefetch
                  scroll={false}
                  onMouseEnter={() => prefetchChapter(pageSlug)}
                  onFocus={() => prefetchChapter(pageSlug)}
                  className={cn(
                    "shrink-0 rounded-full px-3.5 py-2.5 text-sm font-medium tracking-wide transition-colors sm:px-5 sm:py-3 sm:text-base",
                    active
                      ? "bg-atlas-accent/20 text-atlas-accent"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                >
                  {tabLabel(s.sectionType, s.title)}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content with swipe */}
      <main
        className="relative z-10 h-[100dvh] overflow-hidden"
        style={{
          paddingTop: "var(--portal-v2-nav-offset)",
          paddingBottom: "calc(var(--portal-v2-dock-height) + env(safe-area-inset-bottom))",
        }}
        onTouchStart={handleSwipeStart}
        onTouchEnd={handleSwipeEnd}
      >
        <ChapterTransition direction={navDirection}>{children}</ChapterTransition>
      </main>

      {/* Bottom dock */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className={cn(experienceDockV2, "flex w-full max-w-md items-center gap-2 p-2 sm:max-w-lg")}>
          <Link
            href={withDraft(experienceHref(slug, "pro-forma"))}
            prefetch
            scroll={false}
            onMouseEnter={() => prefetchChapter("pro-forma")}
            onFocus={() => prefetchChapter("pro-forma")}
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-atlas-accent px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-[#0a0d14] transition-colors hover:bg-atlas-accent-hover sm:text-sm"
          >
            Pro Forma
          </Link>
          {marketUrl ? (
            <a
              href={marketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-white/25 bg-white/5 px-4 py-2.5 text-xs font-medium uppercase tracking-widest text-white/90 transition-colors hover:border-white/40 hover:bg-white/10 sm:text-sm"
            >
              <span className="truncate">{marketLabel}</span>
            </a>
          ) : (
            <Link
              href={`/${slug}/aircraft`}
              prefetch
              className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-white/25 bg-white/5 px-4 py-2.5 text-xs font-medium uppercase tracking-widest text-white/90 transition-colors hover:border-white/40 hover:bg-white/10 sm:text-sm"
            >
              Your aircraft
            </Link>
          )}
        </div>
      </div>

      {clientDisplayName ? (
        <p className="pointer-events-none fixed bottom-[calc(var(--portal-v2-dock-height)+env(safe-area-inset-bottom)+0.25rem)] left-0 right-0 z-30 text-center text-[10px] tracking-wide text-white/30">
          {clientDisplayName}
        </p>
      ) : null}

      {disclaimer ? (
        <p className="pointer-events-none fixed bottom-0 left-0 right-0 z-20 px-4 py-1 text-center text-[9px] leading-snug text-white/20 sm:text-[10px]">
          <span className="line-clamp-1">{disclaimer}</span>
        </p>
      ) : null}
    </div>
  );
}
