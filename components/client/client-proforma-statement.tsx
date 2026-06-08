"use client";

import { memo, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ProFormaStatementRow } from "@/lib/proforma-statement";

type ColMode = "full" | "annual_only";

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

export function ClientProFormaStatement({
  rows,
  period = "annual",
  compact = false,
  className,
  collapsible = false,
}: {
  rows: ProFormaStatementRow[];
  period?: "annual" | "monthly";
  compact?: boolean;
  className?: string;
  /** When true, section groups collapse by default with expand/collapse all controls. */
  collapsible?: boolean;
}) {
  const displayRows = useMemo(() => rows.filter((r) => r.kind !== "info"), [rows]);
  const groups = useMemo(() => groupRowsBySection(displayRows), [displayRows]);
  const sectionKeys = useMemo(
    () => groups.map((g) => g.section.key),
    [groups]
  );

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const isExpanded = (key: string) => (collapsible ? (expanded[key] ?? false) : true);

  function expandAll() {
    const next: Record<string, boolean> = {};
    for (const key of sectionKeys) next[key] = true;
    setExpanded(next);
  }

  function collapseAll() {
    setExpanded({});
  }

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
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={expandAll}
          className="rounded-md border border-white/20 px-3 py-1.5 text-xs uppercase tracking-wide text-white/70 transition-colors hover:border-white/40 hover:text-white"
        >
          Expand all
        </button>
        <button
          type="button"
          onClick={collapseAll}
          className="rounded-md border border-white/20 px-3 py-1.5 text-xs uppercase tracking-wide text-white/70 transition-colors hover:border-white/40 hover:text-white"
        >
          Collapse all
        </button>
      </div>

      <div
        className={cn(
          "overflow-x-auto rounded-lg border border-white/15 bg-white/5 backdrop-blur",
          compact && "max-h-[28rem] overflow-y-auto"
        )}
      >
        <div className="divide-y divide-white/10">
          {groups.map(({ section, lines }) => {
            const open = isExpanded(section.key);
            const colMode = colModeForLayout(section.layout);
            const showRateHours = colMode === "full";

            return (
              <div key={section.key}>
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [section.key]: !open }))
                  }
                  className="flex w-full items-center gap-2 border-t border-white/10 bg-atlas-accent/10 px-4 py-2 text-left first:border-t-0 hover:bg-atlas-accent/15"
                >
                  {open ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-atlas-accent" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-atlas-accent" />
                  )}
                  <p className="text-xs font-semibold uppercase tracking-wide text-atlas-accent">
                    {section.label}
                  </p>
                </button>

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
}

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
        compact && "max-h-[28rem] overflow-y-auto",
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
}: {
  row: ProFormaStatementRow;
  period: "annual" | "monthly";
  colMode: ColMode;
}) {
  const isTotal = row.kind === "subtotal" || row.kind === "total";
  const showRateHours = colMode === "full";
  const amt = displayAmount(row, period);

  return (
    <div
      className={cn(
        "grid items-center gap-2 px-4 py-2 text-sm",
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
