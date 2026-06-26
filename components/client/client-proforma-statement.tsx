"use client";

import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ProFormaStatementRow } from "@/lib/proforma-statement";

type ColMode = "full" | "annual_only";

export function proFormaStatementToolbarButtonClass(active = false) {
  return cn(
    "rounded-md border px-3 py-1.5 text-xs uppercase tracking-wide transition-colors",
    active
      ? "border-atlas-accent/50 bg-atlas-accent/15 text-atlas-accent"
      : "border-white/20 text-white/70 hover:border-white/40 hover:text-white"
  );
}

function colModeForLayout(layout: ProFormaStatementRow["layout"]): ColMode {
  return layout === "revenue" || layout === "hourly_variable" ? "full" : "annual_only";
}

function fmtRate(rate: number | null | undefined) {
  if (rate == null || !Number.isFinite(rate) || rate === 0) return "—";
  return `$${rate.toLocaleString(undefined, { maximumFractionDigits: 0 })}/hr`;
}

function fmtHours(hours: number | null | undefined) {
  if (hours == null || !Number.isFinite(hours) || hours === 0) return "—";
  return hours % 1 === 0 ? String(hours) : hours.toFixed(1);
}

function displayAmount(
  row: ProFormaStatementRow,
  period: "annual" | "monthly"
): number | null {
  if (period === "monthly") return row.monthly;
  return row.annual;
}

function groupRowsBySection(rows: ProFormaStatementRow[]) {
  const groups: Array<{ section: ProFormaStatementRow; lines: ProFormaStatementRow[] }> = [];
  let current: { section: ProFormaStatementRow; lines: ProFormaStatementRow[] } | null = null;

  for (const row of rows) {
    if (row.kind === "section") {
      current = { section: row, lines: [] };
      groups.push(current);
      continue;
    }
    if (current) current.lines.push(row);
  }

  return groups;
}

/** Owner cost summary stays visible — not affected by collapse all. */
function isPinnedSection(section: ProFormaStatementRow) {
  return section.layout === "owner_summary";
}

function resolveSectionTotal(
  lines: ProFormaStatementRow[],
  period: "annual" | "monthly"
): number | null {
  for (let i = lines.length - 1; i >= 0; i--) {
    const row = lines[i];
    if (row.kind === "subtotal" || row.kind === "total") {
      return displayAmount(row, period);
    }
  }

  let sum = 0;
  let hasValue = false;
  for (const row of lines) {
    if (row.kind !== "line") continue;
    const amt = displayAmount(row, period);
    if (amt == null) continue;
    sum += amt;
    hasValue = true;
  }
  return hasValue ? sum : null;
}

export type ClientProFormaStatementHandle = {
  expandAll: () => void;
  collapseAll: () => void;
};

export const ClientProFormaStatement = forwardRef<
  ClientProFormaStatementHandle,
  {
    rows: ProFormaStatementRow[];
    period?: "annual" | "monthly";
    compact?: boolean;
    className?: string;
    collapsible?: boolean;
    defaultExpanded?: boolean;
    /** Hide built-in expand/collapse toolbar (use external controls + ref). */
    hideToolbar?: boolean;
    /** When set, Annual / Monthly toggles render in the toolbar beside expand/collapse. */
    onPeriodChange?: (period: "annual" | "monthly") => void;
  }
>(function ClientProFormaStatement(
  {
    rows,
    period = "annual",
    compact = false,
    className,
    collapsible = false,
    defaultExpanded = false,
    hideToolbar = false,
    onPeriodChange,
  },
  ref
) {
  const displayRows = useMemo(() => rows.filter((r) => r.kind !== "info"), [rows]);
  const groups = useMemo(() => groupRowsBySection(displayRows), [displayRows]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const isExpanded = (section: ProFormaStatementRow) => {
    if (!collapsible || isPinnedSection(section)) return true;
    return expanded[section.key] ?? defaultExpanded;
  };

  const collapsibleSectionKeys = useMemo(
    () => groups.filter((g) => !isPinnedSection(g.section)).map((g) => g.section.key),
    [groups]
  );

  const expandAllSections = useCallback(() => {
    const next: Record<string, boolean> = {};
    for (const key of collapsibleSectionKeys) next[key] = true;
    setExpanded(next);
  }, [collapsibleSectionKeys]);

  const collapseAllSections = useCallback(() => {
    const next: Record<string, boolean> = {};
    for (const key of collapsibleSectionKeys) next[key] = false;
    setExpanded(next);
  }, [collapsibleSectionKeys]);

  useImperativeHandle(
    ref,
    () => ({ expandAll: expandAllSections, collapseAll: collapseAllSections }),
    [expandAllSections, collapseAllSections]
  );

  if (!collapsible) {
    return (
      <FlatStatement
        displayRows={displayRows}
        period={period}
        compact={compact}
        className={className}
      />
    );
  }

  return (
    <div className={cn(!hideToolbar && "space-y-3", className)}>
      {!hideToolbar ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={expandAllSections}
              className={proFormaStatementToolbarButtonClass()}
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={collapseAllSections}
              className={proFormaStatementToolbarButtonClass()}
            >
              Collapse all
            </button>
          </div>
          {onPeriodChange ? (
            <div className="flex flex-wrap items-center gap-2">
              {(["annual", "monthly"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPeriodChange(p)}
                  className={proFormaStatementToolbarButtonClass(period === p)}
                >
                  {p}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-white/15 bg-white/5 backdrop-blur">
        <div className="divide-y divide-white/10">
          {groups.map(({ section, lines }) => {
            const pinned = isPinnedSection(section);
            const open = isExpanded(section);
            const colMode = colModeForLayout(section.layout);
            const showRateHours = colMode === "full";
            const sectionTotal = resolveSectionTotal(lines, period);

            const headerClassName =
              "flex w-full items-center gap-2 border-t border-white/10 bg-atlas-accent/10 px-4 py-2 text-left first:border-t-0";

            return (
              <div key={section.key}>
                {pinned ? (
                  <div className={headerClassName}>
                    <span className="text-xs font-semibold uppercase tracking-wide text-atlas-accent">
                      {section.label}
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((prev) => ({ ...prev, [section.key]: !open }))
                    }
                    className={cn(headerClassName, "hover:bg-atlas-accent/15")}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      {open ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-atlas-accent" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-atlas-accent" />
                      )}
                      <span className="text-xs font-semibold uppercase tracking-wide text-atlas-accent">
                        {section.label}
                      </span>
                    </span>
                    {!open && sectionTotal != null ? (
                      <span
                        className={cn(
                          "shrink-0 font-mono text-xs tabular-nums sm:text-sm",
                          sectionTotal > 0 && section.layout === "revenue"
                            ? "text-emerald-400/90"
                            : "text-white/85"
                        )}
                      >
                        {formatCurrency(sectionTotal)}
                      </span>
                    ) : null}
                  </button>
                )}

                {open ? (
                  <>
                    <div
                      className={cn(
                        "grid gap-2 border-b border-white/10 px-4 py-1.5 text-[10px] uppercase tracking-wider text-white/40",
                        showRateHours
                          ? "grid-cols-[1fr_5rem_4rem_6rem]"
                          : "grid-cols-[1fr_6rem]"
                      )}
                    >
                      <span>Line item</span>
                      {showRateHours ? (
                        <>
                          <span className="text-right">Rate</span>
                          <span className="text-right">Hours</span>
                        </>
                      ) : null}
                      <span className="text-right">
                        {period === "annual" ? "Annual" : "Monthly"}
                      </span>
                    </div>
                    {lines.map((row) => (
                      <StatementLine
                        key={row.key}
                        row={row}
                        period={period}
                        colMode={colMode}
                        compact={compact}
                      />
                    ))}
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

function FlatStatement({
  displayRows,
  period,
  compact,
  className,
}: {
  displayRows: ProFormaStatementRow[];
  period: "annual" | "monthly";
  compact: boolean;
  className?: string;
}) {
  let currentColMode: ColMode = "annual_only";

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-lg border border-white/15 bg-white/5 backdrop-blur",
        className
      )}
    >
      <div className="divide-y divide-white/10">
        {displayRows.map((row) => {
          if (row.kind === "section") {
            currentColMode = colModeForLayout(row.layout);
            const showRateHours = currentColMode === "full";
            return (
              <div key={row.key} className="bg-white/[0.03]">
                <div className="border-t border-white/10 bg-atlas-accent/10 px-4 py-2 first:border-t-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-atlas-accent">
                    {row.label}
                  </p>
                </div>
                <div
                  className={cn(
                    "grid gap-2 border-b border-white/10 px-4 py-1.5 text-[10px] uppercase tracking-wider text-white/40",
                    showRateHours
                      ? "grid-cols-[1fr_5rem_4rem_6rem]"
                      : "grid-cols-[1fr_6rem]"
                  )}
                >
                  <span>Line item</span>
                  {showRateHours ? (
                    <>
                      <span className="text-right">Rate</span>
                      <span className="text-right">Hours</span>
                    </>
                  ) : null}
                  <span className="text-right">{period === "annual" ? "Annual" : "Monthly"}</span>
                </div>
              </div>
            );
          }

          return (
            <StatementLine
              key={row.key}
              row={row}
              period={period}
              colMode={currentColMode}
              compact={compact}
            />
          );
        })}
      </div>
    </div>
  );
}

function StatementLine({
  row,
  period,
  colMode,
  compact = false,
}: {
  row: ProFormaStatementRow;
  period: "annual" | "monthly";
  colMode: ColMode;
  compact?: boolean;
}) {
  const isTotal = row.kind === "subtotal" || row.kind === "total";
  const showRateHours = colMode === "full";
  const amt = displayAmount(row, period);

  return (
    <div
      className={cn(
        "grid items-center gap-2 px-4 text-sm",
        compact ? "py-1 text-xs" : "py-2 text-sm",
        showRateHours ? "grid-cols-[1fr_5rem_4rem_6rem]" : "grid-cols-[1fr_6rem]",
        isTotal && "bg-white/10 font-medium"
      )}
    >
      <p
        className={cn(
          "min-w-0 truncate",
          isTotal ? "text-white" : "text-white/75",
          row.key === "net_annual_owner" && "text-atlas-accent"
        )}
        title={row.label}
      >
        {row.label}
      </p>
      {showRateHours ? (
        <>
          <p className="text-right font-mono text-xs tabular-nums text-white/50">
            {row.kind === "line" ? fmtRate(row.rate) : "—"}
          </p>
          <p className="text-right font-mono text-xs tabular-nums text-white/50">
            {row.kind === "line" || (isTotal && row.hours != null)
              ? fmtHours(row.hours)
              : "—"}
          </p>
        </>
      ) : null}
      <p
        className={cn(
          "shrink-0 whitespace-nowrap text-right font-mono text-xs tabular-nums sm:text-sm",
          row.sign === "revenue" && amt != null && amt > 0 && "text-emerald-400/90",
          isTotal && row.key === "net_annual_owner" && "text-base text-atlas-accent"
        )}
      >
        {amt != null ? formatCurrency(amt) : "—"}
      </p>
    </div>
  );
}
