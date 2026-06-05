"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  EXPERIENCE_TAB_LABELS,
  SECTION_TYPE_TO_SLUG,
  type ExperienceSectionSnapshot,
  getExperienceNavSections,
} from "@/lib/experience-content";

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
  const navSections = getExperienceNavSections(sections);

  function tabHref(sectionType: string) {
    const pageSlug = SECTION_TYPE_TO_SLUG[sectionType as keyof typeof SECTION_TYPE_TO_SLUG];
    return `/${slug}/experience/${pageSlug}`;
  }

  function isActive(sectionType: string) {
    const href = tabHref(sectionType);
    return pathname === href || pathname?.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-screen bg-[#0a0d14] text-white">
      <header className="portal-nav fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#0a0d14]/85 backdrop-blur-md">
        <div className="flex h-[var(--portal-nav-height)] items-center gap-2 px-3 sm:gap-3 sm:px-5">
          <Link href={`/${slug}/experience/welcome`} className="flex shrink-0 items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl ?? "/images/prismjet-logo.svg"}
              alt="PrismJet"
              className="h-6 w-auto max-w-[120px] object-contain sm:h-7"
            />
          </Link>
          {clientDisplayName ? (
            <span className="hidden truncate text-xs text-white/50 sm:inline sm:max-w-[140px]">
              {clientDisplayName}
            </span>
          ) : null}

          <nav
            className="ml-auto flex min-w-0 flex-1 items-center gap-0 overflow-x-auto scrollbar-none"
            aria-label="PrismJet Experience"
          >
            {navSections.map((s) => {
              const active = isActive(s.sectionType);
              const label =
                EXPERIENCE_TAB_LABELS[
                  s.sectionType as keyof typeof EXPERIENCE_TAB_LABELS
                ] ?? s.title;
              return (
                <Link
                  key={s.sectionType}
                  href={tabHref(s.sectionType)}
                  className={cn(
                    "shrink-0 whitespace-nowrap px-2.5 py-1 text-[11px] font-medium tracking-wide transition-colors sm:text-xs",
                    active ? "portal-nav-active text-atlas-accent" : "text-white/65 hover:text-white"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <Link
            href={`/${slug}/experience/pro-forma`}
            className="hidden shrink-0 rounded-md bg-atlas-accent px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#0a0d14] hover:bg-atlas-accent-hover sm:inline-flex sm:text-xs"
          >
            Pro Forma
          </Link>
        </div>
      </header>

      <main className="pt-[var(--portal-nav-height)]">{children}</main>
      {disclaimer ? (
        <footer className="border-t border-white/10 px-6 py-4 text-center text-[11px] leading-relaxed text-white/35">
          {disclaimer}
        </footer>
      ) : null}
    </div>
  );
}
