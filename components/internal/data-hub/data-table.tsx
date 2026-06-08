"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
};

const PAGE_SIZE = 25;

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
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = String((a as Record<string, unknown>)[sortKey] ?? "");
      const bv = String((b as Record<string, unknown>)[sortKey] ?? "");
      const cmp = av.localeCompare(bv, undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  }

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
            <tr className="border-b border-atlas-border bg-atlas-surface text-left text-xs text-atlas-muted">
              {columns.map((c) => (
                <th key={String(c.key)} className="px-3 py-2">
                  {c.sortable !== false ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-atlas-text"
                      onClick={() => toggleSort(String(c.key))}
                    >
                      {c.label}
                      {sortKey === c.key ? (sortDir === "asc" ? " ↑" : " ↓") : null}
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
              {(onEdit || onDelete) && <th className="px-3 py-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onEdit || onDelete ? 1 : 0)}
                  className="px-3 py-6 text-center text-atlas-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageRows.map((row, i) => (
                <tr key={row.id ?? i} className="border-b border-atlas-border/50">
                  {columns.map((c) => (
                    <td key={String(c.key)} className="px-3 py-2">
                      {c.render
                        ? c.render(row)
                        : String((row as Record<string, unknown>)[c.key as string] ?? "")}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="space-x-2 px-3 py-2">
                      {onEdit ? (
                        <Button variant="secondary" size="sm" onClick={() => onEdit(row)}>
                          Edit
                        </Button>
                      ) : null}
                      {onDelete && row.id ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-atlas-muted hover:text-atlas-danger"
                          onClick={() => onDelete(row)}
                        >
                          Delete
                        </Button>
                      ) : null}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {sorted.length > PAGE_SIZE ? (
        <div className="mt-2 flex items-center justify-between text-xs text-atlas-muted">
          <span>
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of{" "}
            {sorted.length}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
