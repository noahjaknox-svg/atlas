"use client";

import { Button } from "@/components/ui/button";

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
}: {
  title: string;
  rows: T[];
  columns: DataTableColumn<T>[];
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  emptyMessage?: string;
}) {
  return (
    <div>
      <h2 className="mb-4 font-medium">{title}</h2>
      <div className="overflow-x-auto rounded-lg border border-atlas-border">
        <table className="w-full text-sm">
          <thead>
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
