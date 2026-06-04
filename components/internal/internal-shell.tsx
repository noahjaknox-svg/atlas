import Link from "next/link";
import { Button } from "@/components/ui/button";

export function InternalShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName?: string;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-atlas-border bg-atlas-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="font-serif text-2xl tracking-wide text-atlas-accent">
            Atlas
          </Link>
          <nav className="flex items-center gap-6 text-sm text-atlas-muted">
            <Link href="/dashboard" className="hover:text-atlas-text">
              Dashboard
            </Link>
            <Link href="/proposals/new">
              <Button size="sm">+ New Proposal</Button>
            </Link>
            {userName && <span className="text-atlas-muted">{userName}</span>}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
    </div>
  );
}
