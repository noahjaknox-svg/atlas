import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { getInternalUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { InternalShell } from "@/components/internal/internal-shell";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_TABS = [
  "all",
  "draft",
  "internal_review",
  "approved",
  "published",
  "viewed",
  "revised",
  "won",
  "lost",
] as const;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const user = await getInternalUser();
  const params = await searchParams;
  const statusFilter = params.status ?? "all";
  const query = params.q?.trim();

  const proposals = await prisma.proposal.findMany({
    where: {
      deletedAt: null,
      ...(statusFilter !== "all" ? { status: statusFilter as never } : {}),
      ...(query
        ? {
            OR: [
              { proposalName: { contains: query, mode: "insensitive" } },
              { prospect: { prospectName: { contains: query, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      prospect: true,
      aircraftInstance: { include: { aircraftMaster: true } },
      scenarios: { where: { isBaseCase: true }, take: 1 },
      clientPortal: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return (
    <InternalShell userName={user?.name}>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl">Proposals</h1>
          <p className="mt-1 text-atlas-muted">Aircraft management outlooks</p>
        </div>
        <Link href="/proposals/new">
          <Button>+ New Proposal</Button>
        </Link>
      </div>

      <form className="mb-6 flex flex-wrap gap-3" action="/dashboard" method="get">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search proposals…"
          className="h-10 min-w-[240px] flex-1 rounded-md border border-atlas-border bg-atlas-surface px-3 text-sm"
        />
        <input type="hidden" name="status" value={statusFilter} />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab}
            href={`/dashboard?status=${tab}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
            className={`rounded-full px-3 py-1 text-xs capitalize transition-colors ${
              statusFilter === tab
                ? "bg-atlas-accent text-atlas-bg"
                : "bg-atlas-surface text-atlas-muted hover:text-atlas-text"
            }`}
          >
            {tab.replace(/_/g, " ")}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-atlas-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-atlas-surface text-atlas-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Prospect</th>
              <th className="px-4 py-3 font-medium">Aircraft</th>
              <th className="px-4 py-3 font-medium">Base</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3 font-medium text-right">Net Annual</th>
              <th className="px-4 py-3 font-medium">Portal</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {proposals.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-atlas-muted">
                  No proposals yet.{" "}
                  <Link href="/proposals/new" className="text-atlas-accent hover:underline">
                    Create your first proposal
                  </Link>
                </td>
              </tr>
            ) : (
              proposals.map((p) => {
                const scenario = p.scenarios[0];
                const portal = p.clientPortal;
                return (
                  <tr key={p.id} className="border-t border-atlas-border hover:bg-atlas-surface/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/proposals/${p.id}`}
                        className="font-medium text-atlas-text hover:text-atlas-accent"
                      >
                        {p.prospect.prospectName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-atlas-muted">
                      {p.aircraftInstance?.aircraftMaster
                        ? `${p.aircraftInstance.aircraftMaster.manufacturer} ${p.aircraftInstance.aircraftMaster.model}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {p.aircraftInstance?.proposedHomeBaseIcao ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-atlas-muted">
                      {formatDistanceToNow(p.updatedAt, { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {formatCurrency(scenario?.netAnnualCost ? Number(scenario.netAnnualCost) : null)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {portal?.active ? (
                        <span className="text-atlas-success">Active</span>
                      ) : portal ? (
                        <span className="text-atlas-muted">Inactive</span>
                      ) : (
                        <span className="text-atlas-muted">Not created</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 text-xs">
                        <Link href={`/proposals/${p.id}`} className="text-atlas-accent hover:underline">
                          Edit
                        </Link>
                        {portal?.active && (
                          <Link
                            href={`/${portal.slug}/home`}
                            target="_blank"
                            className="text-atlas-muted hover:text-atlas-text"
                          >
                            Preview
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </InternalShell>
  );
}
