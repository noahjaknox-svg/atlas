import { InternalShell } from "@/components/internal/internal-shell";

export default function PipelineLoading() {
  return (
    <InternalShell>
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-atlas-surface" />
        <div className="h-4 w-64 rounded bg-atlas-surface" />
        <div className="mt-8 grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-lg border border-atlas-border p-4">
              <div className="h-4 w-3/4 rounded bg-atlas-surface" />
              <div className="h-16 rounded bg-atlas-surface" />
              <div className="h-16 rounded bg-atlas-surface" />
            </div>
          ))}
        </div>
      </div>
    </InternalShell>
  );
}
