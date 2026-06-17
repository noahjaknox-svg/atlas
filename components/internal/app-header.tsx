"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { NewProposalDialog } from "@/components/internal/new-proposal-dialog";

type NavItem = { href: string; label: string };

type Program = {
  id: string;
  label: string;
  /** Pages shown in the center nav when this program is active. */
  items: readonly NavItem[];
};

const PROGRAMS = [
  {
    id: "aircraft-management",
    label: "Aircraft Management",
    items: [
      { href: "/pipeline", label: "Pipeline" },
      { href: "/proposal-design", label: "Proposal Design" },
    ],
  },
  {
    id: "charter",
    label: "Charter",
    items: [{ href: "/schedule", label: "Schedule" }],
  },
] as const satisfies readonly Program[];

const DATA_WAREHOUSE: Program = {
  id: "data-warehouse",
  label: "Data Warehouse",
  items: [{ href: "/data", label: "Data Warehouse" }],
};

const ALL_PROGRAMS: readonly Program[] = [...PROGRAMS, DATA_WAREHOUSE];

function isItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getActiveProgram(pathname: string): Program {
  const match = ALL_PROGRAMS.find((program) =>
    program.items.some((item) => isItemActive(pathname, item.href))
  );
  return match ?? PROGRAMS[0];
}

export function AppHeader({
  userName,
  isAdmin,
}: {
  userName?: string;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [programMenuOpen, setProgramMenuOpen] = useState(false);
  const programMenuRef = useRef<HTMLDivElement>(null);

  const activeProgram = getActiveProgram(pathname);

  // Close the program menu on navigation.
  useEffect(() => {
    setProgramMenuOpen(false);
  }, [pathname]);

  // Close the program menu when clicking outside of it.
  useEffect(() => {
    if (!programMenuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (
        programMenuRef.current &&
        !programMenuRef.current.contains(event.target as Node)
      ) {
        setProgramMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [programMenuOpen]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-atlas-border bg-atlas-bg/95 backdrop-blur">
      <div className="grid h-14 w-full grid-cols-[1fr_auto_1fr] items-center px-3 lg:px-5">
        <div className="flex h-9 items-center justify-self-start gap-3">
          <div className="flex h-9 items-center" aria-label="PrismJet">
            <Image
              src="/images/prismjet-logo.png"
              alt="PrismJet"
              width={246}
              height={87}
              className="h-9 w-auto object-contain"
              priority
            />
          </div>
          <span className="h-7 w-px bg-atlas-border/80" aria-hidden />
          <Link
            href="/pipeline"
            className="font-serif text-[2rem] leading-none tracking-wide text-white"
          >
            Atlas
          </Link>

          <div className="relative" ref={programMenuRef}>
            <button
              type="button"
              onClick={() => setProgramMenuOpen((open) => !open)}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-sm text-atlas-muted transition-colors hover:text-atlas-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/50"
              aria-haspopup="menu"
              aria-expanded={programMenuOpen}
            >
              <span className="font-medium text-atlas-text">
                {activeProgram.label}
              </span>
              <svg
                viewBox="0 0 12 12"
                className={cn(
                  "h-3 w-3 transition-transform",
                  programMenuOpen && "rotate-180"
                )}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden
              >
                <path d="M3 4.5 6 7.5 9 4.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {programMenuOpen && (
              <div
                role="menu"
                className="absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-md border border-atlas-border bg-atlas-surface py-1 shadow-lg"
              >
                <p className="px-3 pb-1 pt-1.5 text-[0.7rem] font-medium uppercase tracking-wide text-atlas-muted">
                  Programs
                </p>
                {PROGRAMS.map((program) => {
                  const active = program.id === activeProgram.id;
                  return (
                    <Link
                      key={program.id}
                      href={program.items[0].href}
                      role="menuitem"
                      className={cn(
                        "block px-3 py-2 text-sm transition-colors hover:bg-atlas-border/30 hover:text-atlas-text",
                        active
                          ? "text-atlas-accent"
                          : "text-atlas-text"
                      )}
                    >
                      {program.label}
                    </Link>
                  );
                })}
                <div className="my-1 h-px bg-atlas-border" aria-hidden />
                <Link
                  href={DATA_WAREHOUSE.items[0].href}
                  role="menuitem"
                  className={cn(
                    "block px-3 py-2 text-sm transition-colors hover:bg-atlas-border/30 hover:text-atlas-text",
                    activeProgram.id === DATA_WAREHOUSE.id
                      ? "text-atlas-accent"
                      : "text-atlas-text"
                  )}
                >
                  {DATA_WAREHOUSE.label}
                </Link>
              </div>
            )}
          </div>
        </div>

        <nav className="flex items-center justify-center gap-0.5">
          {activeProgram.items.map((item) => {
            const active = isItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-atlas-accent/15 text-atlas-accent"
                    : "text-atlas-muted hover:text-atlas-text"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-end gap-3">
          <NewProposalDialog />
          <div className="relative group">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-atlas-border bg-atlas-surface text-xs font-medium text-atlas-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/50"
              aria-label="Account menu"
            >
              {userName?.slice(0, 2).toUpperCase() ?? "—"}
            </button>
            <div className="absolute right-0 top-full z-50 hidden min-w-[168px] rounded-md border border-atlas-border bg-atlas-surface py-1 shadow-lg group-hover:block group-focus-within:block">
              {userName && (
                <p className="border-b border-atlas-border px-3 py-2 text-xs text-atlas-muted">
                  {userName}
                </p>
              )}
              <Link
                href="/settings"
                className="block px-3 py-2 text-sm hover:bg-atlas-border/30 hover:text-atlas-text"
              >
                Settings
              </Link>
              {isAdmin && (
                <Link
                  href="/settings/integrations"
                  className="block px-3 py-2 text-sm hover:bg-atlas-border/30 hover:text-atlas-text"
                >
                  Integrations
                </Link>
              )}
              {isAdmin && (
                <Link
                  href="/settings/users"
                  className="block px-3 py-2 text-sm hover:bg-atlas-border/30 hover:text-atlas-text"
                >
                  Manage users
                </Link>
              )}
              <Link
                href="/help"
                className="block px-3 py-2 text-sm hover:bg-atlas-border/30 hover:text-atlas-text"
              >
                Help
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-atlas-border/30 hover:text-atlas-text"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
