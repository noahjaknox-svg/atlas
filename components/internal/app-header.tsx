"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { NewProposalDialog } from "@/components/internal/new-proposal-dialog";

const NAV_ITEMS = [
  { href: "/pipeline", label: "Pipeline" },
  { href: "/proposal-design", label: "Proposal Design" },
  { href: "/data", label: "Data" },
] as const;

export function AppHeader({
  userName,
  isAdmin,
}: {
  userName?: string;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

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
        </div>

        <nav className="flex items-center justify-center gap-0.5">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
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
              className="flex h-8 w-8 items-center justify-center rounded-full border border-atlas-border bg-atlas-surface text-xs font-medium text-atlas-text"
              aria-label="Account menu"
            >
              {userName?.slice(0, 2).toUpperCase() ?? "?"}
            </button>
            <div className="absolute right-0 top-full z-50 hidden min-w-[168px] rounded-md border border-atlas-border bg-atlas-surface py-1 shadow-lg group-hover:block group-focus-within:block">
              {userName && (
                <p className="border-b border-atlas-border px-3 py-2 text-xs text-atlas-muted">
                  {userName}
                </p>
              )}
              {isAdmin && (
                <Link
                  href="/settings/users"
                  className="block px-3 py-2 text-sm hover:bg-atlas-border/30 hover:text-atlas-text"
                >
                  Manage users
                </Link>
              )}
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
