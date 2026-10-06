"use client";

/** Usage-type filter for the Portal Designer page list. */
export function UsageTypeSelector({
  usageTypes,
  selectedId,
  onChange,
  className,
}: {
  usageTypes: { id: string; name: string }[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
  className?: string;
}) {
  return (
    <select
      aria-label="Filter by usage type"
      value={selectedId ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className={className ?? "atlas-input h-8 w-full text-sm"}
    >
      <option value="">All usage types</option>
      {usageTypes.map((ut) => (
        <option key={ut.id} value={ut.id}>
          {ut.name}
        </option>
      ))}
    </select>
  );
}
