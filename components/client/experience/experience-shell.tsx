"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EXPERIENCE_TAB_LABELS,
  SECTION_TYPE_TO_SLUG,
  type ExperienceSectionSnapshot,
  getExperienceNavSections,
} from "@/lib/experience-content";

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
}: {
  slug: string;
  sections: ExperienceSectionSnapshot[];
  children: React.ReactNode;
  logoUrl?: string;
  clientDisplayName?: string;
  disclaimer?: string | null;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const navSections = getExperienceNavSections(sections).filter(
    (s) => s.sectionType !== "pro_forma"
  );

  function tabHref(sectionType: string) {
    const pageSlug = SECTION_TYPE_TO_SLUG[sectionType as keyof typeof SECTION_TYPE_TO_SLUG];
    return `/${slug}/experience/${pageSlug}`;
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
      "shrink-0 whitespace-nowrap border-b-2 font-medium transition-colors",
      mobile
        ? "px-2.5 py-2 text-xs tracking-[0.1em]"
        : "px-3 py-2 text-xs tracking-[0.12em] sm:text-sm lg:px-4",
      active
        ? "border-atlas-accent text-white"
        : "border-transparent text-white/65 hover:border-white/20 hover:text-white"
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
      href={`/${slug}/experience/pro-forma`}
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
    <div className="min-h-screen bg-[#0a0d14] text-white">
      <header className="portal-nav fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#0a0d14]/85 backdrop-blur-md">
        {/* Mobile header */}
        <div className="flex h-[var(--portal-nav-height)] items-center gap-2 px-3 md:hidden">
          <Link href={`/${slug}/experience/welcome`} className="flex shrink-0 items-center">
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
          <Link href={`/${slug}/experience/welcome`} className="flex shrink-0 items-center">
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

      <main className="pt-[var(--portal-nav-height)]">{children}</main>
      {disclaimer ? (
        <footer className="border-t border-white/10 px-6 py-4 text-center text-[11px] leading-relaxed text-white/35 sm:px-12">
          <p className="mx-auto max-w-3xl">{disclaimer}</p>
        </footer>
      ) : null}
    </div>
  );
}
