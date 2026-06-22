"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { CloudBackground } from "@/components/client/cloud-background";
import {
  EXPERIENCE_TAB_LABELS,
  SECTION_TYPE_TO_SLUG,
  type ExperienceSectionSnapshot,
  getExperienceNavSections,
} from "@/lib/experience-content";
import {
  experienceHref,
  getExperiencePageSlugs,
} from "@/lib/prefetch-experience-routes";
import { useExperiencePrefetch } from "./use-experience-prefetch";

const MOBILE_SHORT_LABELS: Record<string, string> = {
  welcome: "Welcome",
  about_us: "About",
  aircraft_management: "Mgmt",
  aircraft_charter: "Charter",
  maintenance: "Maint",
  sales_acquisitions: "Sales",
  conformity_process: "Conformity",
};

export function ExperienceShell({
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
  const pathname = usePathname();
  const router = useRouter();
  const isDraft = draftMode;
  const [moreOpen, setMoreOpen] = useState(false);

  const withDraft = useCallback(
    (href: string) => (isDraft ? `${href}${href.includes("?") ? "&" : "?"}draft=1` : href),
    [isDraft]
  );

  useExperiencePrefetch(slug, sections, branding);

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

  const pageSlugs = useMemo(() => getExperiencePageSlugs(sections), [sections]);

  const slideProgress = useMemo(() => {
    const match = pathname?.match(/\/experience\/([^/?]+)/);
    const current = match?.[1];
    if (!current) return 0;
    const index = pageSlugs.indexOf(current);
    if (index < 0 || pageSlugs.length <= 1) return 0;
    return index / (pageSlugs.length - 1);
  }, [pathname, pageSlugs]);

  const goToAdjacentSlide = useCallback(
    (delta: number) => {
      const match = pathname?.match(/\/experience\/([^/?]+)/);
      const current = match?.[1];
      if (!current) return;
      const index = pageSlugs.indexOf(current);
      if (index < 0) return;
      const next = pageSlugs[index + delta];
      if (!next) return;
      router.push(withDraft(experienceHref(slug, next)), { scroll: false });
    },
    [pathname, pageSlugs, router, slug, withDraft]
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
    const href = tabHref(sectionType);
    return pathname === href || pathname?.startsWith(`${href}/`);
  }

  function isProFormaActive() {
    return (
      pathname?.includes("/experience/pro-forma") ||
      pathname?.includes("/pro-forma")
    );
  }

  function tabLabel(sectionType: string, title: string, compact: boolean) {
    if (compact && MOBILE_SHORT_LABELS[sectionType]) {
      return MOBILE_SHORT_LABELS[sectionType];
    }
    return EXPERIENCE_TAB_LABELS[sectionType as keyof typeof EXPERIENCE_TAB_LABELS] ?? title;
  }

  function linkClass(active: boolean, mobile = false) {
    return cn(
      "shrink-0 whitespace-nowrap font-medium transition-colors",
      mobile
        ? "px-2.5 py-2 text-xs tracking-[0.1em]"
        : "px-3 py-2 text-xs tracking-[0.12em] sm:text-sm lg:px-4",
      active ? "portal-nav-active text-white" : "text-white/65 hover:text-white"
    );
  }

  const mobilePrimary = navSections.slice(0, 4);
  const mobileOverflow = navSections.slice(4);

  const welcome = sections.find((s) => s.sectionType === "welcome");
  const marketUrl = welcome?.contentBlocks?.aircraftMarketUrl?.trim();
  const marketLabel =
    welcome?.contentBlocks?.aircraftMarketButtonLabel?.trim() || "Available aircraft";

  const proFormaCta = (
    <Link
      href={withDraft(experienceHref(slug, "pro-forma"))}
      prefetch
      scroll={false}
      className={cn(
        "shrink-0 rounded-md bg-atlas-accent px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#0a0d14] hover:bg-atlas-accent-hover sm:px-4 sm:py-2 sm:text-xs",
        isProFormaActive() && "ring-2 ring-atlas-accent/50"
      )}
    >
      Pro Forma
    </Link>
  );

  const marketCta = marketUrl ? (
    <a
      href={marketUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0 rounded-md border border-white/25 px-3 py-1.5 text-[10px] font-medium uppercase tracking-widest text-white/90 hover:border-white/40 hover:bg-white/5 sm:px-4 sm:py-2 sm:text-xs"
    >
      <span className="max-w-[5rem] truncate sm:max-w-none">{marketLabel}</span>
    </a>
  ) : null;

  const headerCtas = (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      {proFormaCta}
      {marketCta}
    </div>
  );

  return (
    <div className="relative h-screen overflow-hidden text-white">
      <CloudBackground
        imageUrl={branding.heroCloudImageUrl}
        videoUrl={branding.heroCloudVideoUrl}
        overlay="dark"
        fixed
        kenBurns={!branding.heroCloudVideoUrl}
      />
      {isDraft ? (
        <div className="fixed left-0 right-0 top-0 z-[60] bg-atlas-accent/90 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0a0d14]">
          Draft preview — not visible to the client until published
        </div>
      ) : null}
      <header className="portal-nav fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#0a0d14]/75 backdrop-blur-md">
        <div
          className="pointer-events-none absolute bottom-0 left-0 h-0.5 bg-atlas-accent transition-[width] duration-150 ease-out"
          style={{ width: `${slideProgress * 100}%` }}
          aria-hidden
        />
        {/* Mobile header */}
        <div className="flex h-[var(--portal-nav-height)] items-center gap-2 px-3 md:hidden">
          <Link
            href={withDraft(experienceHref(slug, "welcome"))}
            prefetch
            scroll={false}
            className="flex shrink-0 items-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl ?? "/images/prismjet-logo.svg"}
              alt="PrismJet"
              className="h-7 w-auto max-w-[100px] object-contain"
            />
          </Link>

          <nav
            className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-0"
            aria-label="PrismJet Experience"
          >
            {mobilePrimary.map((s) => (
              <Link
                key={s.sectionType}
                href={tabHref(s.sectionType)}
                prefetch
                scroll={false}
                className={linkClass(isActive(s.sectionType), true)}
              >
                {tabLabel(s.sectionType, s.title, true)}
              </Link>
            ))}
            {mobileOverflow.length > 0 ? (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setMoreOpen((o) => !o)}
                  className={cn(
                    linkClass(mobileOverflow.some((s) => isActive(s.sectionType)), true),
                    "inline-flex items-center gap-0.5"
                  )}
                  aria-expanded={moreOpen}
                >
                  More
                  <ChevronDown
                    className={cn("h-3 w-3 transition-transform", moreOpen && "rotate-180")}
                  />
                </button>
                {moreOpen ? (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-40"
                      aria-label="Close menu"
                      onClick={() => setMoreOpen(false)}
                    />
                    <div className="absolute right-0 top-full z-50 mt-1 min-w-[11rem] rounded-md border border-white/15 bg-[#0a0d14]/95 py-1 shadow-lg">
                      {mobileOverflow.map((s) => (
                        <Link
                          key={s.sectionType}
                          href={tabHref(s.sectionType)}
                          prefetch
                          scroll={false}
                          onClick={() => setMoreOpen(false)}
                          className={cn(
                            "block px-4 py-2.5 text-xs tracking-wide",
                            isActive(s.sectionType)
                              ? "text-atlas-accent"
                              : "text-white/75 hover:bg-white/10"
                          )}
                        >
                          {tabLabel(s.sectionType, s.title, false)}
                        </Link>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </nav>

          {headerCtas}
        </div>

        {/* Desktop: logo left | centered tabs | Pro Forma right */}
        <div className="hidden h-[var(--portal-nav-height)] grid-cols-[auto_1fr_auto] items-center gap-4 px-6 lg:px-10 md:grid">
          <Link
            href={withDraft(experienceHref(slug, "welcome"))}
            prefetch
            scroll={false}
            className="flex shrink-0 items-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl ?? "/images/prismjet-logo.svg"}
              alt="PrismJet"
              className="h-8 w-auto max-w-[130px] object-contain lg:h-9 lg:max-w-[150px]"
            />
          </Link>

          <nav
            className="flex min-w-0 items-center justify-center gap-x-6 xl:gap-x-10"
            aria-label="PrismJet Experience"
          >
            {navSections.map((s) => (
              <Link
                key={s.sectionType}
                href={tabHref(s.sectionType)}
                prefetch
                scroll={false}
                className={linkClass(isActive(s.sectionType))}
              >
                {tabLabel(s.sectionType, s.title, false)}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center justify-end gap-4">
            {clientDisplayName ? (
              <span className="hidden max-w-[140px] truncate text-xs tracking-wide text-white/45 xl:inline">
                {clientDisplayName}
              </span>
            ) : null}
            {headerCtas}
          </div>
        </div>
      </header>

      <main className="relative z-10 h-screen overflow-hidden pt-[var(--portal-nav-height)]">
        <div className="h-[calc(100vh-var(--portal-nav-height))] min-h-0 overflow-hidden">
          {children}
        </div>
        {disclaimer ? (
          <p className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 border-t border-white/5 bg-[#0B0F1A]/50 px-6 py-1.5 text-center text-[9px] leading-snug text-white/30 backdrop-blur-sm sm:px-12 sm:text-[10px]">
            <span className="line-clamp-1">{disclaimer}</span>
          </p>
        ) : null}
      </main>
    </div>
  );
}
