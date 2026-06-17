"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { NewProposalDialog } from "@/components/internal/new-proposal-dialog";

type NavLink = { kind: "link"; href: string; label: string };
type NavAction = { kind: "action"; action: "new-proposal"; label: string };
type NavItem = NavLink | NavAction;

type Department = {
  id: string;
  label: string;
  items: readonly NavItem[];
};

const CHARTER: Department = {
  id: "charter",
  label: "Charter",
  items: [
    { kind: "link", href: "/charter/find", label: "Find Aircraft" },
    { kind: "link", href: "/charter/trips", label: "Trips" },
    { kind: "link", href: "/schedule", label: "Schedule" },
  ],
};

const AIRCRAFT_MANAGEMENT: Department = {
  id: "aircraft-management",
  label: "Aircraft Management",
  items: [
    { kind: "link", href: "/pipeline", label: "Pipeline" },
    { kind: "link", href: "/proposal-design", label: "Proposal Design" },
    { kind: "action", action: "new-proposal", label: "New proposal" },
  ],
};

const DEPARTMENTS = [CHARTER, AIRCRAFT_MANAGEMENT] as const;

const DATA_WAREHOUSE: Department = {
  id: "data-warehouse",
  label: "Data Warehouse",
  items: [{ kind: "link", href: "/data", label: "Data Warehouse" }],
};

function isLinkActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isItemActive(pathname: string, item: NavItem) {
  if (item.kind === "action") {
    return item.action === "new-proposal" && pathname === "/proposals/new";
  }
  return isLinkActive(pathname, item.href);
}

function departmentMatchesPath(department: Department, pathname: string) {
  if (department.id === "aircraft-management" && pathname.startsWith("/proposals")) {
    return true;
  }
  return department.items.some((item) => isItemActive(pathname, item));
}

function getActiveDepartment(pathname: string): Department {
  if (departmentMatchesPath(DATA_WAREHOUSE, pathname)) return DATA_WAREHOUSE;
  const match = DEPARTMENTS.find((department) => departmentMatchesPath(department, pathname));
  return match ?? AIRCRAFT_MANAGEMENT;
}

function navItemClass(active: boolean) {
  return cn(
    "rounded px-3 py-1.5 text-sm transition-colors",
    active
      ? "bg-atlas-accent/15 text-atlas-accent"
      : "text-atlas-muted hover:text-atlas-text"
  );
}

function NavMenuItem({
  item,
  pathname,
  onNavigate,
  className,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  const active = isItemActive(pathname, item);

  if (item.kind === "action") {
    return (
      <NewProposalDialog
        trigger={
          <button
            type="button"
            role="menuitem"
            className={cn(
              "block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-atlas-border/30 hover:text-atlas-text",
              active ? "text-atlas-accent" : "text-atlas-text",
              className
            )}
          >
            {item.label}
          </button>
        }
      />
    );
  }

  return (
    <Link
      href={item.href}
      role="menuitem"
      onClick={onNavigate}
      className={cn(
        "block px-3 py-2 text-sm transition-colors hover:bg-atlas-border/30 hover:text-atlas-text",
        active ? "text-atlas-accent" : "text-atlas-text",
        className
      )}
    >
      {item.label}
    </Link>
  );
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
  const [departmentMenuOpen, setDepartmentMenuOpen] = useState(false);
  const departmentMenuRef = useRef<HTMLDivElement>(null);

  const activeDepartment = getActiveDepartment(pathname);
  const centerItems =
    activeDepartment.id === DATA_WAREHOUSE.id
      ? DATA_WAREHOUSE.items
      : activeDepartment.items;

  useEffect(() => {
    setDepartmentMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!departmentMenuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (
        departmentMenuRef.current &&
        !departmentMenuRef.current.contains(event.target as Node)
      ) {
        setDepartmentMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [departmentMenuOpen]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-atlas-border bg-atlas-bg/95 backdrop-blur">
      <div className="grid h-14 w-full grid-cols-[1fr_auto_1fr] items-center px-3 lg:px-5">
        <div className="flex h-9 items-center justify-self-start gap-3">
          <Link href="/pipeline" className="flex h-9 items-center" aria-label="PrismJet home">
            <Image
              src="/images/prismjet-logo.png"
              alt="PrismJet"
              width={246}
              height={87}
              className="h-9 w-auto object-contain"
              priority
            />
          </Link>

          <div className="relative" ref={departmentMenuRef}>
            <button
              type="button"
              onClick={() => setDepartmentMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded px-2 py-1 text-sm transition-colors hover:text-atlas-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/50"
              aria-haspopup="menu"
              aria-expanded={departmentMenuOpen}
            >
              {DEPARTMENTS.map((department, index) => (
                <span key={department.id} className="flex items-center gap-2">
                  {index > 0 && (
                    <span className="text-atlas-border" aria-hidden>
                      |
                    </span>
                  )}
                  <span
                    className={cn(
                      "font-medium",
                      department.id === activeDepartment.id
                        ? "text-atlas-text"
                        : "text-atlas-muted"
                    )}
                  >
                    {department.label}
                  </span>
                </span>
              ))}
              <svg
                viewBox="0 0 12 12"
                className={cn(
                  "h-3 w-3 transition-transform",
                  departmentMenuOpen && "rotate-180"
                )}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden
              >
                <path d="M3 4.5 6 7.5 9 4.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {departmentMenuOpen && (
              <div
                role="menu"
                className="absolute left-0 top-full z-50 mt-1 min-w-[240px] rounded-md border border-atlas-border bg-atlas-surface py-1 shadow-lg"
              >
                {DEPARTMENTS.map((department) => (
                  <div key={department.id}>
                    <p className="px-3 pb-1 pt-2 text-[0.7rem] font-medium uppercase tracking-wide text-atlas-muted">
                      {department.label}
                    </p>
                    {department.items.map((item) => (
                      <NavMenuItem
                        key={item.kind === "link" ? item.href : item.action}
                        item={item}
                        pathname={pathname}
                        onNavigate={() => setDepartmentMenuOpen(false)}
                      />
                    ))}
                  </div>
                ))}
                <div className="my-1 h-px bg-atlas-border" aria-hidden />
                <NavMenuItem
                  item={DATA_WAREHOUSE.items[0]}
                  pathname={pathname}
                  onNavigate={() => setDepartmentMenuOpen(false)}
                />
              </div>
            )}
          </div>
        </div>

        <nav className="flex items-center justify-center gap-0.5">
          {centerItems.map((item) => {
            const active = isItemActive(pathname, item);

            if (item.kind === "action") {
              return (
                <NewProposalDialog
                  key={item.action}
                  trigger={
                    <button type="button" className={navItemClass(active)}>
                      {item.label}
                    </button>
                  }
                />
              );
            }

            return (
              <Link key={item.href} href={item.href} className={navItemClass(active)}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-end gap-3">
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
