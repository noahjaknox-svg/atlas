"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
};

export function DataTable<T extends { id?: string }>({
  title,
  rows,
  columns,
  onEdit,
  onDelete,
  emptyMessage = "No records yet.",
  fillHeight = false,
}: {
  title: string;
  rows: T[];
  columns: DataTableColumn<T>[];
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  emptyMessage?: string;
  fillHeight?: boolean;
}) {
  return (
    <div className={fillHeight ? "flex min-h-0 flex-1 flex-col" : undefined}>
      {title ? <h2 className="mb-4 font-medium">{title}</h2> : null}
      <div
        className={cn(
          "overflow-x-auto rounded-lg border border-atlas-border",
          fillHeight && "min-h-0 flex-1 overflow-y-auto"
        )}
      >
        <table className={cn("w-full text-sm", fillHeight && "min-w-full")}>
          <thead className={fillHeight ? "sticky top-0 z-10 bg-atlas-surface" : undefined}>
            <tr className="border-b border-atlas-border bg-atlas-surface text-left text-xs uppercase text-atlas-muted">
              {columns.map((c) => (
                <th key={String(c.key)} className="px-3 py-2">
                  {c.label}
                </th>
              ))}
              {(onEdit || onDelete) && <th className="px-3 py-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onEdit || onDelete ? 1 : 0)}
                  className="px-3 py-6 text-center text-atlas-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={row.id ?? i} className="border-b border-atlas-border/50">
                  {columns.map((c) => (
                    <td key={String(c.key)} className="px-3 py-2">
                      {c.render
                        ? c.render(row)
                        : String((row as Record<string, unknown>)[c.key as string] ?? "")}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="px-3 py-2 space-x-2">
                      {onEdit && (
                        <Button variant="ghost" size="sm" onClick={() => onEdit(row)}>
                          Edit
                        </Button>
                      )}
                      {onDelete && row.id && (
                        <Button variant="danger" size="sm" onClick={() => onDelete(row)}>
                          Delete
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
