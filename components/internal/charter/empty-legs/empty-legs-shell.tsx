"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";
import { CharterShell } from "@/components/internal/charter/charter-shell";
import type { DepartmentId } from "@/lib/departments";

const SUBNAV: { href: string; label: string; exact?: boolean }[] = [
  { href: ROUTES.charter.emptyLegs, label: "Inventory", exact: true },
  { href: ROUTES.charter.emptyLegsPublicLists, label: "Public Lists" },
  { href: ROUTES.charter.emptyLegsRoutingProfiles, label: "Routing Profiles" },
  { href: ROUTES.charter.emptyLegsAircraftProfiles, label: "Aircraft Profiles" },
  { href: ROUTES.charter.emptyLegsFleet, label: "Fleet Config" },
  { href: ROUTES.charter.emptyLegsSettings, label: "Settings" },
];

export function EmptyLegsShell({
  children,
  userName,
  isAdmin,
  allowedDepartments,
  title,
  description,
}: {
  children: React.ReactNode;
  userName?: string;
  isAdmin?: boolean;
  allowedDepartments?: DepartmentId[];
  title?: string;
  description?: string;
}) {
  const pathname = usePathname();

  return (
    <CharterShell userName={userName} isAdmin={isAdmin} allowedDepartments={allowedDepartments}>
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-48">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-atlas-muted">
            Empty Legs
          </p>
          <nav className="flex flex-row flex-wrap gap-1 lg:flex-col">
            {SUBNAV.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
        </aside>
        <div className="min-w-0 flex-1">
          {(title || description) && (
            <div className="mb-6">
              {title ? <h1 className="font-serif text-2xl">{title}</h1> : null}
              {description ? (
                <p className="mt-1 text-sm text-atlas-muted">{description}</p>
              ) : null}
            </div>
          )}
          {children}
        </div>
      </div>
    </CharterShell>
  );
}
