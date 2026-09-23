"use client";

import { cn, formatCurrency } from "@/lib/utils";
import { MoneyInput } from "@/components/ui/money-input";
import { proFormaStatementToolbarButtonClass } from "@/components/client/client-proforma-statement";
import type {
  CompareAmount,
  CompareStatementRow,
  ProFormaComparison,
} from "@/lib/client-proforma-compare";

const sectionTitleClass = "text-xs font-medium uppercase tracking-[0.3em] text-atlas-accent";

/** Sticky label column so aircraft columns can scroll horizontally on narrow screens. */
const labelCellClass =
  "sticky left-0 z-[1] bg-[#0a0d14] py-2 pr-4 text-left align-middle font-normal text-white/70";

const valueCellClass = "px-3 py-2 text-right align-middle font-mono tabular-nums";

function amountFor(value: CompareAmount | null, period: "annual" | "monthly") {
  if (!value) return null;
  return period === "monthly" ? value.monthly : value.annual;
}

function StatementRow({
  row,
  period,
  columnCount,
}: {
  row: CompareStatementRow;
  period: "annual" | "monthly";
  columnCount: number;
}) {
  if (row.kind === "section") {
    return (
      <tr>
        <th
          scope="colgroup"
          colSpan={columnCount + 1}
          className="sticky left-0 bg-[#0a0d14] pb-1 pt-5 text-left text-xs font-medium uppercase tracking-[0.2em] text-white/50"
        >
          {row.label}
        </th>
      </tr>
    );
  }

  const emphasized = row.kind === "subtotal" || row.kind === "total";
  const best = period === "monthly" ? row.best.monthly : row.best.annual;

  return (
    <tr className={cn("border-t border-white/5", emphasized && "border-white/15")}>
      <th scope="row" className={cn(labelCellClass, emphasized && "font-medium text-white")}>
        {row.label}
      </th>
      {row.values.map((value, i) => {
        const amount = amountFor(value, period);
        const isBest = best === i;
        return (
          <td
            key={i}
            className={cn(
              valueCellClass,
              emphasized ? "text-white" : "text-white/80",
              isBest && "text-atlas-accent"
            )}
          >
            {amount != null ? formatCurrency(amount) : <span className="text-white/25">—</span>}
            {isBest ? <span className="sr-only"> (best)</span> : null}
          </td>
        );
      })}
    </tr>
  );
}

export function ProFormaCompare({
  comparison,
  period,
  onPeriodChange,
  aircraftValues,
  onAircraftValueChange,
  onViewAircraft,
}: {
  comparison: ProFormaComparison;
  period: "annual" | "monthly";
  onPeriodChange: (period: "annual" | "monthly") => void;
  /** Raw (formatted-input) aircraft value per column id. */
  aircraftValues: Record<string, string>;
  onAircraftValueChange: (aircraftId: string, value: string) => void;
  /** Leave compare and open this aircraft's single pro forma. */
  onViewAircraft: (aircraftId: string) => void;
}) {
  const { columns, metricRows, statementRows } = comparison;
  const headlineRows = metricRows.filter(
    (r) =>
      r.key !== "aircraftValue" &&
      // Hide the charter line entirely when no compared aircraft charters.
      (r.key !== "charterRevenueOffset" || r.values.some((v) => v !== 0))
  );
  const anyCrewRaised = columns.some((c) => c.crewStepRaised);

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={sectionTitleClass}>Side-by-side comparison</p>
        <div className="flex gap-2">
          {(["annual", "monthly"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPeriodChange(p)}
              className={proFormaStatementToolbarButtonClass(period === p)}
            >
              {p === "annual" ? "Annual" : "Monthly"}
            </button>
          ))}
        </div>
      </div>
      <p className="text-sm text-white/60">
        Your owner hours, crew and financing apply to every aircraft. The best figure in each row
        is highlighted in gold.
      </p>

      <div className="overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className={cn(labelCellClass, "align-bottom")}>
                <span className="sr-only">Line item</span>
              </th>
              {columns.map((col) => (
                <th key={col.id} scope="col" className="min-w-[10rem] px-3 pb-3 text-right align-bottom">
                  <div className="flex flex-col items-end gap-2">
                    {col.portalImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={col.portalImageUrl}
                        alt=""
                        className="h-14 w-24 rounded-md object-cover"
                      />
                    ) : null}
                    <span className="font-serif text-base font-normal text-white">{col.label}</span>
                    {col.tailNumber ? (
                      <span className="text-xs font-normal text-white/45">{col.tailNumber}</span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onViewAircraft(col.id)}
                      className="text-xs font-normal text-atlas-accent hover:underline"
                    >
                      View full pro forma
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-white/15">
              <th scope="row" className={labelCellClass}>
                Aircraft value
              </th>
              {columns.map((col) => (
                <td key={col.id} className={valueCellClass}>
                  <MoneyInput
                    value={aircraftValues[col.id] ?? String(col.aircraftValue)}
                    onChange={(v) => onAircraftValueChange(col.id, v)}
                    aria-label={`${col.label} aircraft value`}
                    className="ml-auto w-[9.5rem] max-w-full rounded border border-white/20 bg-white/10 px-2 py-1.5 text-right font-mono text-sm tabular-nums text-white focus:border-atlas-accent focus:outline-none focus:ring-1 focus:ring-atlas-accent/30"
                  />
                </td>
              ))}
            </tr>
            {headlineRows.map((row) => (
              <tr key={row.key} className="border-t border-white/15">
                <th scope="row" className={cn(labelCellClass, "font-medium text-white")}>
                  {row.label}
                </th>
                {row.values.map((v, i) => (
                  <td
                    key={i}
                    className={cn(
                      valueCellClass,
                      "text-base text-white",
                      row.best === i && "text-atlas-accent"
                    )}
                  >
                    {row.key === "costPerOwnerHour" && v <= 0 ? "—" : formatCurrency(v)}
                    {row.best === i ? <span className="sr-only"> (best)</span> : null}
                  </td>
                ))}
              </tr>
            ))}
            {anyCrewRaised ? (
              <tr>
                <td colSpan={columns.length + 1} className="pt-2 text-xs text-white/45">
                  Crew raised to the minimum required at these hours for:{" "}
                  {columns
                    .filter((c) => c.crewStepRaised)
                    .map((c) => c.label)
                    .join(", ")}
                  .
                </td>
              </tr>
            ) : null}
            {statementRows.map((row) => (
              <StatementRow key={row.key} row={row} period={period} columnCount={columns.length} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
