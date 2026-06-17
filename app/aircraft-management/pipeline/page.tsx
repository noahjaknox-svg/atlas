import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { loadPipelinePage } from "@/lib/pipeline-load";
import { perfTimed } from "@/lib/perf-log";
import { InternalShell } from "@/components/internal/internal-shell";
import { PipelineBoard } from "@/components/internal/pipeline-board";

export default async function PipelinePage() {
  const user = await perfTimed("pipeline auth", () => getInternalUser());
  if (!user) redirect("/login");

  const { cards, atlasUsers, totalCount, hasMore } = await perfTimed(
    "pipeline query",
    () => loadPipelinePage()
  );

  return (
    <InternalShell userName={user.name} isAdmin={user.role === "admin"}>
      <h1 className="font-serif text-2xl">Pipeline</h1>
      <p className="mt-1 text-sm text-atlas-muted">
        Sales workflow
        {totalCount > cards.length ? (
          <span className="ml-2 text-atlas-muted/80">
            (showing {cards.length} of {totalCount})
          </span>
        ) : null}
      </p>

      <PipelineBoard
        initialCards={cards}
        atlasUsers={atlasUsers}
        isAdmin={user.role === "admin"}
        totalCount={totalCount}
        hasMore={hasMore}
      />
    </InternalShell>
  );
}
