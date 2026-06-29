"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "./motion-lite";
import { cn } from "@/lib/utils";
import { CloudBackground } from "@/components/client/cloud-background";
import { experienceHref, withExperienceDraftQuery } from "@/lib/prefetch-experience-routes";
import { DEFAULT_LOGO } from "@/lib/portal-constants";
import {
  EXPERIENCE_TAB_LABELS,
  SECTION_TYPE_TO_SLUG,
  resolvePortalNavLinks,
  type ExperienceSectionSnapshot,
  type ExperienceSectionType,
  getExperienceChapterSections,
  getExperienceHomeSlug,
  isProFormaSectionVisible,
} from "@/lib/experience-content";
import { useExperiencePrefetch, usePrefetchExperienceChapter } from "../use-experience-prefetch";
import {
  ExperienceBootstrapProvider,
  useExperienceBootstrap,
  type ExperienceBootstrap,
} from "./experience-bootstrap-context";
import { ExperienceChapterDeck } from "./experience-chapter-deck";
import { experienceNavPillV2 } from "./experience-tokens";
import { PortalNavExtraLinks } from "../portal-nav-extra-links";

const CLOUDS_PREF_KEY = "portal-v2-clouds-enabled";

const MOBILE_SHORT_LABELS: Record<string, string> = {
  about_us: "About",
  aircraft_management: "Management",
  aircraft_charter: "Charter",
  maintenance: "Maintenance",
  sales_acquisitions: "Sales",
  conformity_process: "Conformity",
};

function NavDivider() {
  return (
    <div
      className="mx-1 w-px shrink-0 self-stretch bg-white/10 sm:mx-1.5"
      aria-hidden
    />
  );
}

type ShellCommonProps = {
  slug: string;
  sections: ExperienceSectionSnapshot[];
  logoUrl?: string;
  clientDisplayName?: string;
  disclaimer?: string | null;
  branding: { heroCloudImageUrl: string; heroCloudVideoUrl: string | null; logoUrl?: string | null };
  draftMode?: boolean;
};

function useCloudsToggle() {
  const [cloudsEnabled, setCloudsEnabled] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CLOUDS_PREF_KEY);
      if (stored === "0") setCloudsEnabled(false);
    } catch {
      /* ignore storage errors */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CLOUDS_PREF_KEY, cloudsEnabled ? "1" : "0");
    } catch {
      /* ignore storage errors */
    }
  }, [cloudsEnabled]);

  return [cloudsEnabled, setCloudsEnabled] as const;
}

function navActionClass(active: boolean, primary?: boolean) {
  return cn(
    "shrink-0 rounded-full px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors sm:px-5 sm:py-3 sm:text-[13px]",
    primary
      ? active
        ? "bg-atlas-accent text-[#0a0d14]"
        : "bg-atlas-accent/90 text-[#0a0d14] hover:bg-atlas-accent"
      : active
        ? "border border-atlas-accent/50 bg-atlas-accent/15 text-atlas-accent"
        : "border border-white/20 bg-white/5 text-white/80 hover:border-white/35 hover:bg-white/10 hover:text-white"
  );
}

function tabLabel(sectionType: string, title: string) {
  return (
    MOBILE_SHORT_LABELS[sectionType] ??
    EXPERIENCE_TAB_LABELS[sectionType as keyof typeof EXPERIENCE_TAB_LABELS] ??
    title
  );
}

function ExperienceShellV2Frame({
  slug,
  sections,
  logoUrl,
  clientDisplayName,
  disclaimer,
  branding,
  draftMode = false,
  welcomeActive,
  proFormaActive,
  isActive,
  welcomeHref,
  onWelcomeClick,
  chapterHref,
  onChapterClick,
  proFormaHref,
  onProFormaClick,
  showProForma,
  prefetchChapter,
  main,
  onTouchStart,
  onTouchEnd,
  mainRef,
}: ShellCommonProps & {
  welcomeActive: boolean;
  proFormaActive: boolean;
  isActive: (sectionType: string) => boolean;
  welcomeHref: string;
  onWelcomeClick?: (e: React.MouseEvent) => void;
  chapterHref: (sectionType: string) => string;
  onChapterClick?: (e: React.MouseEvent, pageSlug: string) => void;
  proFormaHref: string;
  onProFormaClick?: (e: React.MouseEvent) => void;
  showProForma: boolean;
  prefetchChapter: (pageSlug: string) => void;
  main: ReactNode;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
  mainRef?: React.RefObject<HTMLElement>;
}) {
  const [cloudsEnabled, setCloudsEnabled] = useCloudsToggle();
  const shellRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const footer = footerRef.current;
    const shell = shellRef.current;
    if (!footer || !shell) return;

    const syncFooterHeight = () => {
      const height = footer.offsetHeight;
      if (height > 0) {
        shell.style.setProperty("--portal-v2-footer-height", `${height}px`);
      }
    };

    syncFooterHeight();
    const observer = new ResizeObserver(syncFooterHeight);
    observer.observe(footer);
    return () => observer.disconnect();
  }, [disclaimer, clientDisplayName]);

  const navSections = getExperienceChapterSections(sections);
  const hasChapterTabs = navSections.length > 0;
  const showProFormaButton = showProForma;

  const welcome = sections.find((s) => s.sectionType === "welcome");
  const navExtraLinks = resolvePortalNavLinks(welcome?.contentBlocks);

  const resolvedLogo = logoUrl ?? branding.logoUrl ?? DEFAULT_LOGO;
  const draftBannerOffset = draftMode ? "1.5rem" : "0px";
  const footerOffset = "var(--portal-v2-footer-height)";

  return (
    <div ref={shellRef} className="dark relative min-h-[100dvh] text-white">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[#0a0d14]" aria-hidden />
      {cloudsEnabled ? (
        <CloudBackground
          imageUrl={branding.heroCloudImageUrl}
          videoUrl={branding.heroCloudVideoUrl}
          overlay="dark"
          fixed
          priorityVideo
          kenBurns
        />
      ) : null}
      {draftMode ? (
        <div className="fixed left-0 right-0 top-0 z-[60] bg-atlas-accent/90 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0a0d14]">
          Draft preview — not visible to the client until published
        </div>
      ) : null}

      <div
        className="fixed left-0 right-0 z-50 flex justify-center px-3"
        style={{
          top: draftMode
            ? "calc(1.5rem + max(0.75rem, env(safe-area-inset-top)))"
            : "max(0.75rem, env(safe-area-inset-top))",
        }}
      >
        <div
          className={cn(
            experienceNavPillV2,
            "flex max-w-[min(100%,72rem)] items-stretch gap-0 px-2.5 py-2.5 sm:max-w-[min(100%,92rem)] sm:px-4 sm:py-3"
          )}
        >
          <a
            href={welcomeHref}
            onClick={onWelcomeClick}
            onMouseEnter={() => prefetchChapter("welcome")}
            onFocus={() => prefetchChapter("welcome")}
            className={cn(
              "flex shrink-0 items-center py-1 pl-2 pr-1 transition-colors sm:pl-3 sm:pr-2",
              welcomeActive && "text-white"
            )}
            aria-label="PrismJet — Welcome"
            aria-current={welcomeActive ? "page" : undefined}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolvedLogo}
              alt="PrismJet"
              className="h-10 w-auto max-w-[132px] object-contain sm:h-12 sm:max-w-[160px]"
            />
          </a>

          {hasChapterTabs ? <NavDivider /> : null}

          {hasChapterTabs ? (
            <nav
              className="scrollbar-none portal-v2-scroll-fade flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-2 sm:gap-1.5 sm:px-3 md:[mask-image:none] md:[-webkit-mask-image:none]"
              aria-label="Chapters"
            >
              {navSections.map((s) => {
                const active = isActive(s.sectionType);
                const pageSlug =
                  SECTION_TYPE_TO_SLUG[s.sectionType as ExperienceSectionType] ?? s.sectionType;
                return (
                  <a
                    key={s.sectionType}
                    href={chapterHref(s.sectionType)}
                    onClick={
                      onChapterClick
                        ? (e) => onChapterClick(e, pageSlug)
                        : undefined
                    }
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
                  </a>
                );
              })}
            </nav>
          ) : null}

          {hasChapterTabs ? <NavDivider /> : null}

          <div
            className={cn(
              "flex shrink-0 items-center gap-1.5 py-1 pl-1 pr-2 sm:gap-2 sm:pl-2 sm:pr-3",
              !hasChapterTabs && "ml-auto"
            )}
          >
            {showProFormaButton ? (
              <a
                href={proFormaHref}
                onClick={onProFormaClick}
                onMouseEnter={() => prefetchChapter("pro-forma")}
                onFocus={() => prefetchChapter("pro-forma")}
                className={navActionClass(proFormaActive, true)}
              >
                Pro Forma
              </a>
            ) : null}
            <PortalNavExtraLinks
              links={navExtraLinks}
              buttonClassName={navActionClass(false)}
            />
          </div>
        </div>
      </div>

      <main
        ref={mainRef}
        className="relative z-10 flex h-[100dvh] flex-col overflow-hidden"
        style={{
          paddingTop: `calc(${draftBannerOffset} + var(--portal-v2-nav-offset))`,
          paddingBottom: footerOffset,
          ...(draftMode ? { ["--portal-v2-draft-offset" as string]: "1.5rem" } : {}),
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="min-h-0 flex-1 overflow-hidden">{main}</div>
      </main>

      <div
        ref={footerRef}
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.06] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-md"
        style={{
          background:
            "linear-gradient(to top, rgb(10 13 20 / 0.94) 65%, rgb(10 13 20 / 0.72))",
        }}
      >
        <div className="relative z-[1] mx-auto flex max-w-[100rem] items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:gap-6">
          <div className="w-[32%] min-w-[6rem] shrink-0 sm:w-auto sm:max-w-[20rem] lg:max-w-[22rem]">
            {clientDisplayName ? (
              <p className="truncate font-serif text-2xl font-medium leading-none tracking-tight text-white/95 sm:text-3xl lg:text-4xl">
                {clientDisplayName}
              </p>
            ) : null}
          </div>

          <div className="min-w-0 flex-1 text-center">
            {disclaimer ? (
              <p className="mx-auto max-w-4xl text-[9px] leading-snug text-white/35 sm:text-[10px]">
                <span className="line-clamp-2">{disclaimer}</span>
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 justify-end">
            <button
              type="button"
              aria-pressed={cloudsEnabled}
              aria-label={cloudsEnabled ? "Hide cloud background" : "Show cloud background"}
              onClick={() => setCloudsEnabled((on) => !on)}
              className={cn(
                experienceNavPillV2,
                "flex items-center gap-2 rounded-full px-3 py-1.5 sm:px-3.5 sm:py-2",
                "text-[10px] font-medium uppercase tracking-[0.2em] text-white/45 transition-colors hover:text-white/70"
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
                  cloudsEnabled ? "bg-atlas-accent/70" : "bg-white/25"
                )}
                aria-hidden
              />
              Clouds
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExperienceShellV2DeckInner(props: ShellCommonProps) {
  const reducedMotion = useReducedMotion();
  const mainRef = useRef<HTMLElement>(null);

  const {
    navigate,
    goToAdjacentSlide,
    tabHref,
    isActive,
    withDraft,
    activeSlug,
    isTransitioning,
  } = useExperienceBootstrap();

  const prefetchChapter = usePrefetchExperienceChapter(props.slug, props.draftMode);
  useExperiencePrefetch(props.slug, props.sections, props.branding, props.draftMode);

  useEffect(() => {
    if (isTransitioning) return;
    mainRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [activeSlug, isTransitioning]);

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
    const dy = t.clientY - swipeStart.current.y;
    swipeStart.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) goToAdjacentSlide(1);
    else goToAdjacentSlide(-1);
  }

  function handleChapterClick(e: React.MouseEvent, pageSlug: string) {
    e.preventDefault();
    navigate(pageSlug);
  }

  const welcomeActive = activeSlug === "welcome" || isActive("welcome");
  const proFormaActive = activeSlug === "pro-forma" || isActive("pro_forma");
  const homeSlug = getExperienceHomeSlug(props.sections);
  const showProForma = isProFormaSectionVisible(props.sections);

  return (
    <ExperienceShellV2Frame
      {...props}
      welcomeActive={welcomeActive}
      proFormaActive={proFormaActive}
      isActive={isActive}
      welcomeHref={withDraft(experienceHref(props.slug, homeSlug))}
      onWelcomeClick={(e) => handleChapterClick(e, homeSlug)}
      chapterHref={tabHref}
      onChapterClick={handleChapterClick}
      proFormaHref={withDraft(experienceHref(props.slug, "pro-forma"))}
      onProFormaClick={(e) => handleChapterClick(e, "pro-forma")}
      showProForma={showProForma}
      prefetchChapter={prefetchChapter}
      main={<ExperienceChapterDeck />}
      onTouchStart={handleSwipeStart}
      onTouchEnd={handleSwipeEnd}
      mainRef={mainRef}
    />
  );
}

function ExperienceShellV2StaticInner({
  children,
  ...props
}: ShellCommonProps & { children?: ReactNode }) {
  const pathname = usePathname();
  const prefetchChapter = usePrefetchExperienceChapter(props.slug, props.draftMode);
  useExperiencePrefetch(props.slug, props.sections, props.branding, props.draftMode);

  const withDraft = (href: string) =>
    withExperienceDraftQuery(href, props.draftMode ?? false);

  const currentSlug = pathname?.match(/\/experience\/([^/?]+)/)?.[1] ?? null;

  function isActive(sectionType: string) {
    const pageSlug =
      SECTION_TYPE_TO_SLUG[sectionType as ExperienceSectionType] ?? sectionType;
    return currentSlug === pageSlug;
  }

  function chapterHref(sectionType: string) {
    const pageSlug =
      SECTION_TYPE_TO_SLUG[sectionType as ExperienceSectionType] ?? sectionType;
    return withDraft(experienceHref(props.slug, pageSlug));
  }

  const welcomeActive = currentSlug === "welcome" || isActive("welcome");
  const proFormaActive = currentSlug === "pro-forma" || isActive("pro_forma");
  const homeSlug = getExperienceHomeSlug(props.sections);
  const showProForma = isProFormaSectionVisible(props.sections);

  return (
    <ExperienceShellV2Frame
      {...props}
      welcomeActive={welcomeActive}
      proFormaActive={proFormaActive}
      isActive={isActive}
      welcomeHref={withDraft(experienceHref(props.slug, homeSlug))}
      chapterHref={chapterHref}
      proFormaHref={withDraft(experienceHref(props.slug, "pro-forma"))}
      showProForma={showProForma}
      prefetchChapter={prefetchChapter}
      main={children}
    />
  );
}

export function ExperienceShellV2({
  slug,
  sections,
  logoUrl,
  clientDisplayName,
  disclaimer,
  branding,
  draftMode = false,
  experienceBootstrap,
  children,
}: ShellCommonProps & {
  experienceBootstrap?: ExperienceBootstrap;
  children?: ReactNode;
}) {
  const shellProps = {
    slug,
    sections,
    logoUrl,
    clientDisplayName,
    disclaimer,
    branding,
    draftMode,
  };

  if (experienceBootstrap) {
    return (
      <ExperienceBootstrapProvider
        slug={slug}
        sections={sections}
        branding={branding}
        draftMode={draftMode}
        bootstrap={experienceBootstrap}
      >
        <ExperienceShellV2DeckInner {...shellProps} />
      </ExperienceBootstrapProvider>
    );
  }

  return (
    <ExperienceShellV2StaticInner {...shellProps}>{children}</ExperienceShellV2StaticInner>
  );
}
