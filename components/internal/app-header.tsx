"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";
import { DEPARTMENTS, type DepartmentId } from "@/lib/departments";
import { NewProposalDialog } from "@/components/internal/new-proposal-dialog";
import { PROSPECT_PORTAL_DESIGNER } from "@/lib/product-terminology";
import { ThemeAppearanceMenu } from "@/components/theme/theme-appearance-menu";
import { ThemeLogo } from "@/components/theme/theme-logo";

type NavLink = { kind: "link"; href: string; label: string };
type NavAction = { kind: "action"; action: "new-proposal"; label: string };
type NavItem = NavLink | NavAction;

type NavDepartment = {
  id: DepartmentId;
  label: string;
  prefix: string;
  homeHref: string;
  items: readonly NavItem[];
};

const NAV_ITEMS: Record<DepartmentId, readonly NavItem[]> = {
  aircraft_management: [
    { kind: "link", href: ROUTES.aircraftManagement.pipeline, label: "Pipeline" },
    { kind: "link", href: ROUTES.aircraftManagement.proposalDesign, label: PROSPECT_PORTAL_DESIGNER },
    { kind: "action", action: "new-proposal", label: "New proposal" },
  ],
  charter: [
    { kind: "link", href: ROUTES.charter.find, label: "Find Aircraft" },
    { kind: "link", href: ROUTES.charter.trips, label: "Trips" },
    { kind: "link", href: ROUTES.charter.schedule, label: "Schedule" },
    { kind: "link", href: ROUTES.charter.emptyLegs, label: "Empty Legs" },
    { kind: "link", href: ROUTES.charter.leads, label: "Leads" },
  ],
  data_warehouse: [
    { kind: "link", href: ROUTES.dataWarehouse.data, label: "Data Warehouse" },
  ],
};

function buildNavDepartments(allowedDepartments: DepartmentId[]): NavDepartment[] {
  const allowed = new Set(allowedDepartments);
  return DEPARTMENTS.filter((department) => allowed.has(department.id)).map((department) => ({
    id: department.id,
    label: department.label,
    prefix: department.prefix,
    homeHref: department.homeHref,
    items: NAV_ITEMS[department.id],
  }));
}

function isLinkActive(pathname: string, href: string) {
  const base = href.split("?")[0];
  return pathname === base || pathname.startsWith(`${base}/`);
}

function isItemActive(pathname: string, item: NavItem) {
  if (item.kind === "action") {
    return item.action === "new-proposal" && pathname === ROUTES.aircraftManagement.proposalNew;
  }
  return isLinkActive(pathname, item.href);
}

function getActiveDepartment(pathname: string, departments: NavDepartment[]): NavDepartment {
  const match = departments.find((department) => pathname.startsWith(department.prefix));
  return match ?? departments[0] ?? buildNavDepartments(["aircraft_management"])[0];
}

function navItemClass(active: boolean) {
  return cn(
    "rounded px-3 py-1.5 text-sm transition-colors",
    active
      ? "bg-atlas-accent/15 text-atlas-accent"
      : "text-atlas-muted hover:text-atlas-text"
  );
}

export function AppHeader({
  userName,
  isAdmin,
  allowedDepartments = DEPARTMENTS.map((department) => department.id),
}: {
  userName?: string;
  isAdmin?: boolean;
  allowedDepartments?: DepartmentId[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [departmentMenuOpen, setDepartmentMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const departmentMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const visibleDepartments = useMemo(
    () => buildNavDepartments(allowedDepartments),
    [allowedDepartments]
  );
  const activeDepartment = getActiveDepartment(pathname, visibleDepartments);
  const centerItems = activeDepartment.items;
  const showCenterNav =
    centerItems.length > 1 || centerItems.some((item) => item.kind === "action");
  const showDepartmentSwitcher = visibleDepartments.length > 1;

  useEffect(() => {
    setDepartmentMenuOpen(false);
    setAccountMenuOpen(false);
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

  useEffect(() => {
    if (!accountMenuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [accountMenuOpen]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
    router.refresh();
  }

  const homeHref = activeDepartment.homeHref;

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-atlas-border bg-atlas-chrome/95 backdrop-blur">
      <div className="grid h-14 w-full grid-cols-[1fr_auto_1fr] items-center px-3 lg:px-5">
        <div className="flex h-9 items-center justify-self-start gap-3">
          <Link href={homeHref} className="flex h-9 items-center" aria-label="PrismJet home">
            <ThemeLogo className="h-9 w-auto object-contain" priority />
          </Link>

          {showDepartmentSwitcher ? (
            <div className="relative" ref={departmentMenuRef}>
              <button
                type="button"
                onClick={() => setDepartmentMenuOpen((open) => !open)}
                className="flex items-center gap-1.5 rounded px-2 py-1 text-sm font-medium text-atlas-text transition-colors hover:text-atlas-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/50"
                aria-haspopup="menu"
                aria-expanded={departmentMenuOpen}
                aria-label={`Department: ${activeDepartment.label}`}
              >
                <span>{activeDepartment.label}</span>
                <svg
                  viewBox="0 0 12 12"
                  className={cn(
                    "h-3 w-3 text-atlas-muted transition-transform",
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
                  className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-md border border-atlas-border bg-atlas-surface py-1 shadow-lg"
                >
                  {visibleDepartments.map((department) => (
                    <Link
                      key={department.id}
                      href={department.homeHref}
                      role="menuitem"
                      onClick={() => setDepartmentMenuOpen(false)}
                      className={cn(
                        "block px-3 py-2 text-sm transition-colors hover:bg-atlas-border/30 hover:text-atlas-text",
                        department.id === activeDepartment.id
                          ? "text-atlas-accent"
                          : "text-atlas-text"
                      )}
                    >
                      {department.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <span className="px-2 py-1 text-sm font-medium text-atlas-text">
              {activeDepartment.label}
            </span>
          )}
        </div>

        {showCenterNav ? (
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
        ) : (
          <div />
        )}

        <div className="flex items-center justify-end gap-3">
          {activeDepartment.id === "charter" &&
            allowedDepartments.includes("charter") && (
              <Link
                href={ROUTES.charter.settings}
                className={cn(
                  "rounded px-3 py-1.5 text-sm transition-colors",
                  isLinkActive(pathname, ROUTES.charter.settings)
                    ? "bg-atlas-accent/15 text-atlas-accent"
                    : "text-atlas-muted hover:text-atlas-text"
                )}
              >
                Charter Settings
              </Link>
            )}
          <div className="relative" ref={accountMenuRef}>
            <button
              type="button"
              onClick={() => setAccountMenuOpen((open) => !open)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-atlas-border bg-atlas-surface text-xs font-medium text-atlas-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-accent/50"
              aria-label="Account menu"
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
            >
              {userName?.slice(0, 2).toUpperCase() ?? "—"}
            </button>
            {accountMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 min-w-[168px] rounded-md border border-atlas-border bg-atlas-surface py-1 shadow-lg"
              >
                {userName && (
                  <p className="border-b border-atlas-border px-3 py-2 text-xs text-atlas-muted">
                    {userName}
                  </p>
                )}
                <Link
                  href="/settings"
                  role="menuitem"
                  onClick={() => setAccountMenuOpen(false)}
                  className="block px-3 py-2 text-sm hover:bg-atlas-border/30 hover:text-atlas-text"
                >
                  Settings
                </Link>
                <Link
                  href="/settings/integrations"
                  role="menuitem"
                  onClick={() => setAccountMenuOpen(false)}
                  className="block px-3 py-2 text-sm hover:bg-atlas-border/30 hover:text-atlas-text"
                >
                  Integrations
                </Link>
                {isAdmin ? (
                  <Link
                    href="/settings/users"
                    role="menuitem"
                    onClick={() => setAccountMenuOpen(false)}
                    className="block px-3 py-2 text-sm hover:bg-atlas-border/30 hover:text-atlas-text"
                  >
                    Manage users
                  </Link>
                ) : null}
                <Link
                  href="/help"
                  role="menuitem"
                  onClick={() => setAccountMenuOpen(false)}
                  className="block px-3 py-2 text-sm hover:bg-atlas-border/30 hover:text-atlas-text"
                >
                  Help
                </Link>
                <ThemeAppearanceMenu />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void logout()}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-atlas-border/30 hover:text-atlas-text"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
