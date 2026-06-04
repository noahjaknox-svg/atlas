import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  draft: "bg-atlas-border text-atlas-muted",
  internal_review: "bg-amber-900/40 text-amber-200",
  approved: "bg-blue-900/40 text-blue-200",
  published: "bg-atlas-accent/20 text-atlas-accent",
  viewed: "bg-purple-900/40 text-purple-200",
  revised: "bg-orange-900/40 text-orange-200",
  won: "bg-atlas-success/20 text-atlas-success",
  lost: "bg-atlas-danger/20 text-atlas-danger",
};

export function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        statusStyles[status] ?? statusStyles.draft
      )}
    >
      {label}
    </span>
  );
}
