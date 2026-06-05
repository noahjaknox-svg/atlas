"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "deck", label: "Your PrismJet Experience" },
  { href: "about", label: "About us" },
  { href: "aircraft", label: "Your aircraft" },
  { href: "services", label: "Services" },
  { href: "contact", label: "Contact" },
] as const;

export function ClientShell({
  slug,
  children,
  clientDisplayName,
  contactName,
  logoUrl,
  proFormaHref,
  variant = "immersive",
}: {
  slug: string;
  children: React.ReactNode;
  /** Primary name shown inline after logo */
  clientDisplayName?: string;
  /** @deprecated Use clientDisplayName */
  contactName?: string;
  logoUrl?: string;
  /** Override default Pro Forma link (e.g. with ?aircraft=) */
  proFormaHref?: string;
  variant?: "default" | "immersive";
}) {
  const pathname = usePathname();
  const immersive = variant === "immersive";
  const displayName = clientDisplayName ?? contactName;
  const [menuOpen, setMenuOpen] = useState(false);

  function isActive(href: string) {
    const path = `/${slug}/${href}`;
    return pathname === path || pathname?.startsWith(`${path}/`);
  }

  const linkClass = (active: boolean) =>
    cn(
      "shrink-0 whitespace-nowrap px-2 py-1 text-xs font-medium tracking-wide transition-colors sm:text-[13px]",
      immersive
        ? active
          ? "text-atlas-accent"
          : "text-white/75 hover:text-white"
        : active
          ? "text-atlas-accent"
          : "text-atlas-muted hover:text-atlas-text"
    );

  return (
    <div className={cn("min-h-screen", immersive ? "bg-transparent text-white" : "bg-atlas-bg")}>
      <header
        className={cn(
          "portal-nav fixed left-0 right-0 top-0 z-50 border-b backdrop-blur-md",
          immersive
            ? "border-white/10 bg-[#0a0d14]/75 text-white"
            : "border-atlas-border/50 bg-atlas-bg/90 text-atlas-text"
        )}
      >
        <div className="flex h-[var(--portal-nav-height)] items-center gap-2 px-3 sm:gap-3 sm:px-5">
          {/* Left: logo + client name */}
          <Link href={`/${slug}/deck`} className="flex shrink-0 items-center gap-2 sm:gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl ?? "/images/prismjet-logo.svg"}
              alt="PrismJet"
              className="h-6 w-auto max-w-[120px] object-contain object-left sm:h-7 sm:max-w-[140px]"
            />
          </Link>

          {displayName ? (
            <>
              <span
                className={cn(
                  "hidden h-4 w-px shrink-0 sm:block",
                  immersive ? "bg-white/20" : "bg-atlas-border"
                )}
                aria-hidden
              />
              <span
                className={cn(
                  "max-w-[6rem] shrink-0 truncate text-xs font-medium sm:max-w-[10rem] sm:text-sm",
                  immersive ? "text-white/90" : "text-atlas-text"
                )}
                title={displayName}
              >
                {displayName}
              </span>
            </>
          ) : null}

          {/* Center: text nav — horizontal scroll on small screens */}
          <nav
            className="flex min-w-0 flex-1 items-center gap-0 overflow-x-auto scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Portal navigation"
          >
            <div className="flex items-center gap-0 px-1 sm:gap-1 sm:px-2">
              {NAV_LINKS.map((item, i) => (
                <span key={item.href} className="flex items-center">
                  {i > 0 ? (
                    <span
                      className={cn(
                        "mx-1 hidden text-white/25 sm:inline",
                        !immersive && "text-atlas-border"
                      )}
                      aria-hidden
                    >
                      |
                    </span>
                  ) : null}
                  <Link
                    href={`/${slug}/${item.href}`}
                    className={cn(
                      linkClass(isActive(item.href)),
                      isActive(item.href) && "portal-nav-active"
                    )}
                  >
                    {item.label}
                  </Link>
                </span>
              ))}
            </div>
          </nav>

          {/* Right: Pro Forma CTA + overflow */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              href={proFormaHref ?? `/${slug}/pro-forma`}
              className={cn(
                "rounded px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors sm:px-4 sm:py-2 sm:text-xs",
                isActive("pro-forma")
                  ? "bg-atlas-accent text-[#0a0d14] ring-2 ring-atlas-accent/50"
                  : "bg-atlas-accent text-[#0a0d14] hover:bg-atlas-accent-hover"
              )}
            >
              Pro Forma
            </Link>

            <div className="relative no-print">
              <button
                type="button"
                aria-label="More options"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
                className={cn(
                  "rounded p-1.5 transition-colors",
                  immersive
                    ? "text-white/50 hover:bg-white/10 hover:text-white"
                    : "text-atlas-muted hover:text-atlas-text"
                )}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuOpen ? (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-40"
                    aria-label="Close menu"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div
                    className={cn(
                      "absolute right-0 top-full z-50 mt-1 min-w-[8rem] rounded-md border py-1 shadow-lg",
                      immersive
                        ? "border-white/15 bg-[#0a0d14]/95"
                        : "border-atlas-border bg-atlas-surface"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        window.print();
                      }}
                      className={cn(
                        "block w-full px-4 py-2 text-left text-xs",
                        immersive
                          ? "text-white/80 hover:bg-white/10"
                          : "text-atlas-muted hover:bg-atlas-surface/80"
                      )}
                    >
                      Download PDF
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className={cn(immersive ? "pt-[var(--portal-nav-height)]" : "portal-main-default")}>
        {children}
      </main>
    </div>
  );
}
