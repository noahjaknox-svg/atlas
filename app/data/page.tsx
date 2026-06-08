import { Suspense } from "react";
import { redirect } from "next/navigation";
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
    <InternalShell userName={user.name} isAdmin workspace>
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center p-8">
            <p className="text-atlas-muted">Loading…</p>
          </div>
        }
      >
        <DataHubClient initialTab={tab ?? "airports"} />
      </Suspense>
    </InternalShell>
  );
}
