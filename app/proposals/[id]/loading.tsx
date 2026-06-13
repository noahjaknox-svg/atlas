import { InternalShell } from "@/components/internal/internal-shell";

export default function ProposalWorkspaceLoading() {
  return (
    <InternalShell workspace>
      <div className="flex h-full animate-pulse flex-col gap-4 p-6">
        <div className="flex gap-4">
          <div className="h-10 w-64 rounded bg-atlas-surface" />
          <div className="h-10 flex-1 rounded bg-atlas-surface" />
        </div>
        <div className="flex flex-1 gap-4">
          <div className="w-56 rounded-lg bg-atlas-surface" />
          <div className="flex-1 rounded-lg bg-atlas-surface" />
        </div>
      </div>
    </InternalShell>
  );
}
