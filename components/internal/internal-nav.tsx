"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { NewProposalDialog } from "@/components/internal/new-proposal-dialog";

export function InternalNav({
  userName,
  isAdmin,
}: {
  userName?: string;
  isAdmin?: boolean;
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="flex items-center gap-6 text-sm text-atlas-muted">
      <Link href="/pipeline" className="hover:text-atlas-text">
        Pipeline
      </Link>
      {isAdmin && (
        <Link href="/data" className="hover:text-atlas-text">
          Data
        </Link>
      )}
      {isAdmin && (
        <Link href="/performance-data" className="hover:text-atlas-text">
          Performance Data
        </Link>
      )}
      <Link href="/settings" className="hover:text-atlas-text">
        Settings
      </Link>
      <NewProposalDialog />
      <div className="relative group">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-atlas-border text-xs font-medium text-atlas-text"
        >
          {userName?.slice(0, 2).toUpperCase() ?? "?"}
        </button>
        <div className="absolute right-0 top-full z-50 hidden min-w-[160px] rounded-md border border-atlas-border bg-atlas-surface py-1 shadow-lg group-hover:block group-focus-within:block">
          {userName && (
            <p className="border-b border-atlas-border px-3 py-2 text-xs text-atlas-muted">
              {userName}
            </p>
          )}
          {isAdmin && (
            <Link
              href="/settings/users"
              className="block px-3 py-2 hover:bg-atlas-border/30 hover:text-atlas-text"
            >
              Manage users
            </Link>
          )}
          <button
            type="button"
            onClick={() => void logout()}
            className="block w-full px-3 py-2 text-left hover:bg-atlas-border/30 hover:text-atlas-text"
          >
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}
