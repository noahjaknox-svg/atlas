import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getInternalUser } from "@/lib/auth";
import { InternalShell } from "@/components/internal/internal-shell";
import { DataHubClient } from "@/components/internal/data-hub-client";

export default async function DataHubPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getInternalUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/pipeline");

  const { tab } = await searchParams;

  return (
    <InternalShell userName={user.name} isAdmin>
      <div className="mb-6">
        <Link href="/pipeline" className="text-sm text-atlas-accent hover:underline">
          ← Pipeline
        </Link>
        <h1 className="mt-2 font-serif text-3xl">Data Hub</h1>
        <p className="mt-1 text-atlas-muted">Reference data for proposals and pro forma</p>
      </div>
      <Suspense fallback={<p className="text-atlas-muted">Loading…</p>}>
        <DataHubClient initialTab={tab ?? "airports"} />
      </Suspense>
    </InternalShell>
  );
}
