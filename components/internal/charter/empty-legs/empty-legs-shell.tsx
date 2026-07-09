"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";
import { InternalShell } from "@/components/internal/internal-shell";
import type { DepartmentId } from "@/lib/departments";

const SUBNAV: { href: string; label: string; exact?: boolean }[] = [
  { href: ROUTES.charter.emptyLegs, label: "Inventory", exact: true },
  { href: ROUTES.charter.emptyLegsPublicLists, label: "Public Lists" },
  { href: ROUTES.charter.emptyLegsRoutingProfiles, label: "Routing Profiles" },
  { href: ROUTES.charter.emptyLegsAircraftProfiles, label: "Aircraft Profiles" },
  { href: ROUTES.charter.emptyLegsFleet, label: "Fleet Config" },
  { href: ROUTES.charter.emptyLegsSettings, label: "Settings" },
];

function navButtonClass(active: boolean) {
  return cn(
    "block w-full rounded px-3 py-1.5 text-left text-sm transition-colors",
    active
      ? "bg-atlas-accent/15 text-atlas-accent"
      : "text-atlas-muted hover:text-atlas-text"
  );
}

export function EmptyLegsShell({
  children,
  userName,
  isAdmin,
  allowedDepartments,
  title,
  description,
  fillHeight = false,
}: {
  children: React.ReactNode;
  userName?: string;
  isAdmin?: boolean;
  allowedDepartments?: DepartmentId[];
  title?: string;
  description?: string;
  /** Lock page chrome and let the child manage its own scroll (e.g. inventory table). */
  fillHeight?: boolean;
}) {
  const pathname = usePathname();

  return (
    <InternalShell
      userName={userName}
      isAdmin={isAdmin}
      allowedDepartments={allowedDepartments}
      workspace
    >
      <div className="flex h-full min-h-0 flex-col lg:flex-row">
        <div className="shrink-0 border-b border-atlas-border bg-atlas-chrome/95 lg:hidden">
          <nav
            className="atlas-scroll-x flex gap-1 overflow-x-auto px-3 py-2"
            aria-label="Empty Legs sections"
          >
            {SUBNAV.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "shrink-0 rounded px-3 py-1.5 text-sm transition-colors",
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
        </div>

        <aside className="data-hub-sidebar hidden min-h-0 w-56 shrink-0 flex-col border-r border-atlas-border bg-atlas-chrome/95 lg:flex xl:w-60">
          <div className="atlas-scroll min-h-0 flex-1 overflow-y-auto">
            <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-atlas-muted/80">
              Empty Legs
            </p>
            <nav className="space-y-0.5 px-3 pb-3" aria-label="Empty Legs sections">
              {SUBNAV.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link key={item.href} href={item.href} className={navButtonClass(active)}>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <div
          className={cn(
            "min-h-0 flex-1 p-3 sm:p-4 lg:p-5 xl:p-6",
            fillHeight
              ? "flex flex-col overflow-hidden overscroll-none"
              : "atlas-scroll overflow-y-auto"
          )}
        >
          {(title || description) && (
            <header className="mb-3 shrink-0 sm:mb-4">
              {title ? <h1 className="font-serif text-xl sm:text-2xl">{title}</h1> : null}
              {description ? (
                <p className="mt-0.5 text-sm text-atlas-muted">{description}</p>
              ) : null}
            </header>
          )}
          <div className={cn(fillHeight && "flex min-h-0 flex-1 flex-col overflow-hidden")}>
            {children}
          </div>
        </div>
      </div>
    </InternalShell>
  );
}
