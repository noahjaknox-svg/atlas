import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { loadPipelinePage } from "@/lib/pipeline-load";
import { perfTimed } from "@/lib/perf-log";
import { requireDepartmentPageAccess } from "@/lib/require-department-page";
import { getInternalShellProps } from "@/lib/departments";
import { InternalShell } from "@/components/internal/internal-shell";
import { PipelineBoard } from "@/components/internal/pipeline-board";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const user = await perfTimed("pipeline auth", () => getInternalUser());
  if (!user) redirect("/login");
  requireDepartmentPageAccess(user, "aircraft_management");

  const shell = getInternalShellProps(user);

  const { archived: archivedParam } = await searchParams;
  const showArchived = archivedParam === "1";

  const { cards, atlasUsers, totalCount, hasMore } = await perfTimed(
    "pipeline query",
    () => loadPipelinePage(1, { archived: showArchived })
  );

  return (
    <InternalShell {...shell}>
      <h1 className="font-serif text-2xl">Pipeline</h1>
      <p className="mt-1 text-sm text-atlas-muted">
        {showArchived ? "Archived deals" : "Sales workflow"}
        {totalCount > cards.length ? (
          <span className="ml-2 text-atlas-muted/80">
            (showing {cards.length} of {totalCount})
          </span>
        ) : null}
      </p>

      <PipelineBoard
        initialCards={cards}
        atlasUsers={atlasUsers}
        totalCount={totalCount}
        hasMore={hasMore}
        showArchived={showArchived}
      />
    </InternalShell>
  );
}
