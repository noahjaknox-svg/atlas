import { InternalShell } from "@/components/internal/internal-shell";

export default function DataHubLoading() {
  return (
    <InternalShell workspace>
      <div className="flex h-full animate-pulse">
        <div className="w-56 border-r border-atlas-border bg-atlas-surface/50 p-4">
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-8 rounded bg-atlas-surface" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-6">
          <div className="mb-4 h-8 w-48 rounded bg-atlas-surface" />
          <div className="h-10 w-full max-w-md rounded bg-atlas-surface" />
          <div className="mt-6 space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-atlas-surface" />
            ))}
          </div>
        </div>
      </div>
    </InternalShell>
  );
}
