"use client";

import Link from "next/link";

export function ClientShell({
  slug,
  children,
  contactName,
}: {
  slug: string;
  children: React.ReactNode;
  contactName?: string;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-atlas-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href={`/${slug}/home`} className="font-serif text-xl text-atlas-accent">
            Atlas by PrismJet
          </Link>
          <nav className="flex gap-6 text-sm text-atlas-muted">
            <Link href={`/${slug}/home`} className="hover:text-atlas-text">
              Overview
            </Link>
            <Link href={`/${slug}/pro-forma`} className="hover:text-atlas-text">
              Pro Forma
            </Link>
            <button
              type="button"
              onClick={() => typeof window !== "undefined" && window.print()}
              className="no-print hover:text-atlas-text"
            >
              Download PDF
            </button>
          </nav>
        </div>
        {contactName && (
          <p className="mx-auto max-w-6xl px-6 pb-4 text-sm text-atlas-muted">
            Prepared for {contactName}
          </p>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12">{children}</main>
    </div>
  );
}
