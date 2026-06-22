"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { AssumptionMap } from "@/lib/assumptions";
import {
  buildProFormaStatement,
  type ProFormaColumnLayout,
  type ProFormaStatementRow,
} from "@/lib/proforma-statement";
import {
  applyProFormaVisibility,
  isProFormaLineVisible,
  parseProFormaVisibility,
  PROFORMA_VISIBILITY_KEY,
  setProFormaLineVisible,
} from "@/lib/proforma-line-visibility";
import { utilizationPatchToAssumptions } from "@/lib/proforma-utilization";
import { ProFormaScenarioPanel } from "@/components/internal/workspace/pro-forma-utilization-panel";
import { isCharterProFormaRow } from "@/lib/usage-type";
import { cn } from "@/lib/utils";
import type { ProposalOwnerProfile } from "@/lib/proposal-owners";
import type { OwnerExpenseAllocationMode } from "@/lib/owner-expense-allocation";
import {
  buildPerOwnerEconomics,
  buildPerOwnerFinancing,
  type PerOwnerEconomics,
} from "@/lib/proforma-multi-owner";

const METRIC_KEYS_HIDDEN_FROM_TABLE = new Set(["cost_per_owner_hour"]);

/** toggle | label | rate | hours | annual */
const COLS = "atlas-proforma-grid";

type ColMode = "full" | "annual_only";

function colModeForLayout(layout: ProFormaColumnLayout): ColMode {
  switch (layout) {
    case "revenue":
    case "hourly_variable":
      return "full";
    default:
      return "annual_only";
  }
}

function headersForLayout(layout: ProFormaColumnLayout): string[] {
  if (colModeForLayout(layout) === "full") {
    return ["", "Line item", "Rate", "Hours", "Annual"];
  }
  return ["", "Line item", "", "", "Annual"];
}

export function AircraftProFormaColumn({
  assumptions,
  rawAssumptions,
  charterEnabled = true,
  ownerProfiles = [],
  allocationMode = "hybrid",
  onAssumptionsChange,
}: {
  assumptions: AssumptionMap;
  rawAssumptions: AssumptionMap;
  charterEnabled?: boolean;
  ownerProfiles?: ProposalOwnerProfile[];
  allocationMode?: OwnerExpenseAllocationMode;
  onAssumptionsChange: (next: AssumptionMap) => void;
}) {
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  const visibility = useMemo(
    () => parseProFormaVisibility(rawAssumptions),
    [rawAssumptions]
  );

  const statement = useMemo(() => buildProFormaStatement(assumptions), [assumptions]);
  const utilization = statement.utilization;

  const visibleStatement = useMemo(
    () =>
      applyProFormaVisibility(
        statement.rows,
        visibility,
        utilization.ownerFlightHours,
        assumptions
      ),
    [statement.rows, visibility, utilization.ownerFlightHours, assumptions]
  );

  const ownerFlightCostPerHour = useMemo(() => {
    const netRow = visibleStatement.find((r) => r.key === "net_annual_owner");
    const hours = utilization.ownerFlightHours;
    if (!hours || hours <= 0) return 0;
    const netAnnual = netRow?.annual ?? 0;
    return Math.abs(netAnnual) / hours;
  }, [visibleStatement, utilization.ownerFlightHours]);

  const netAnnualOwnerCost = useMemo(() => {
    const netRow = visibleStatement.find((r) => r.key === "net_annual_owner");
    return netRow?.annual != null ? Math.abs(netRow.annual) : 0;
  }, [visibleStatement]);

  const multiOwner = ownerProfiles.length > 1;

  const perOwnerEconomics = useMemo(() => {
    if (!multiOwner) return [];
    return buildPerOwnerEconomics(
      assumptions,
      ownerProfiles,
      statement.rows,
      allocationMode
    );
  }, [multiOwner, assumptions, ownerProfiles, statement.rows, allocationMode]);

  const perOwnerFinancing = useMemo(() => {
    if (!multiOwner) return [];
    return buildPerOwnerFinancing(assumptions, ownerProfiles, allocationMode);
  }, [multiOwner, assumptions, ownerProfiles, allocationMode]);

  const rows = useMemo(() => {
    return visibleStatement
      .filter((r) => r.kind !== "info")
      .filter((r) => !METRIC_KEYS_HIDDEN_FROM_TABLE.has(r.key))
      .filter((r) => charterEnabled || !isCharterProFormaRow(r));
  }, [visibleStatement, charterEnabled]);

  const applyOwnerHours = useCallback(
    (hours: number) => {
      const next = utilizationPatchToAssumptions(assumptions, { ownerHours: hours });
      onAssumptionsChange(next);
    },
    [assumptions, onAssumptionsChange]
  );

  const toggleLine = useCallback(
    (key: string, visible: boolean) => {
      const nextJson = setProFormaLineVisible(visibility, key, visible);
      onAssumptionsChange({
        ...rawAssumptions,
        [PROFORMA_VISIBILITY_KEY]: nextJson,
      });
    },
    [visibility, rawAssumptions, onAssumptionsChange]
  );

  let currentColMode: ColMode = "annual_only";

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <ProFormaScenarioPanel
        profile={utilization}
        charterEnabled={charterEnabled}
        ownerProfiles={ownerProfiles}
        onOwnerHoursChange={applyOwnerHours}
      />

      <div className="min-w-0 rounded-lg border border-atlas-border/80 bg-atlas-surface/20">
        <div className="atlas-workspace-section-header">
          <h3 className="atlas-panel-title">Operating statement</h3>
        </div>
        <div className="min-w-0">
          <div className="divide-y divide-atlas-border/25">
            {rows.map((row) => {
              if (row.kind === "section") {
                currentColMode = colModeForLayout(row.layout);
                const hdrs = headersForLayout(row.layout);
                return (
                  <div key={row.key} className="bg-atlas-surface/10">
                    <div className="border-t border-atlas-border/40 bg-atlas-accent/10 px-3 py-2 sm:px-4">
                      <p className="truncate whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-atlas-accent">
                        {row.label}
                      </p>
                    </div>
                    <div
                      className={cn(
                        COLS,
                        "border-b border-atlas-border/40 bg-atlas-bg/30 px-3 py-1.5 sm:px-4"
                      )}
                    >
                      {hdrs.map((h, i) => (
                        <span
                          key={`${row.key}-h-${i}`}
                          className={cn(
                            "text-[11px] font-semibold uppercase tracking-wide text-atlas-muted whitespace-nowrap",
                            i >= 2 && "text-right"
                          )}
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <PlRow
                  key={row.key}
                  row={row}
                  colMode={currentColMode}
                  visible={row.toggleable ? isProFormaLineVisible(row.key, visibility) : true}
                  onToggle={toggleLine}
                />
              );
            })}
          </div>

          {!multiOwner ? (
            <ProFormaOwnerHourCostFooter
              costPerHour={ownerFlightCostPerHour}
              netAnnualOwnerCost={netAnnualOwnerCost}
              ownerFlightHours={utilization.ownerFlightHours}
            />
          ) : null}
        </div>
      </div>

      {multiOwner ? (
        <div className="flex flex-col gap-4">
          <h3 className="atlas-panel-title">Per-owner economics</h3>
          {perOwnerEconomics.map((e) => (
            <PerOwnerEconomicsCard key={e.profile.sortOrder} economics={e} />
          ))}
          {perOwnerFinancing.length > 0 ? (
            <section className="atlas-workspace-section">
              <div className="atlas-workspace-section-header">
                <h3 className="atlas-panel-title">Financing allocation</h3>
              </div>
              <div className="atlas-workspace-section-body py-3">
                <ul className="space-y-2 text-sm">
                  {perOwnerFinancing.map((f) => (
                    <li
                      key={f.profile.sortOrder}
                      className="flex flex-wrap justify-between gap-2 border-b border-atlas-border/30 pb-2 last:border-b-0 last:pb-0"
                    >
                      <span className="font-medium">{f.profile.displayName}</span>
                      <span className="font-mono tabular-nums text-atlas-muted">
                        {formatCurrency(f.monthlyDebtService)}/mo ·{" "}
                        {formatCurrency(f.impliedEquity)} equity
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      <div className="min-w-0 overflow-hidden rounded-lg border border-atlas-border/60 bg-atlas-bg/30">
        <button
          type="button"
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-atlas-muted hover:text-atlas-text"
          onClick={() => setAssumptionsOpen((o) => !o)}
        >
          {assumptionsOpen ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
          <span className="whitespace-nowrap">Assumptions used</span>
          <span className="atlas-caption shrink-0 font-normal">(off statement)</span>
        </button>
        {assumptionsOpen ? (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 border-t border-atlas-border/40 px-4 py-3 sm:grid-cols-2">
            {statement.assumptionsUsed.map((item) => (
              <div key={item.label} className="flex min-w-0 justify-between gap-3 text-sm">
                <dt className="min-w-0 truncate whitespace-nowrap text-atlas-muted" title={item.label}>
                  {item.label}
                </dt>
                <dd className="shrink-0 whitespace-nowrap font-mono tabular-nums text-atlas-text">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </div>
  );
}

/** @deprecated Use AircraftProFormaColumn */
export const AircraftProFormaTab = AircraftProFormaColumn;

function PerOwnerEconomicsCard({ economics }: { economics: PerOwnerEconomics }) {
  const hours = economics.profile.annualFlightHours;
  const hoursLabel =
    hours > 0 && Number.isFinite(hours)
      ? hours % 1 === 0
        ? `${hours}`
        : hours.toFixed(1)
      : "—";

  return (
    <section className="atlas-workspace-section overflow-hidden">
      <div className="border-b border-atlas-border/50 px-4 py-3">
        <p className="font-medium text-atlas-text">{economics.profile.displayName}</p>
        <p className="atlas-caption text-atlas-muted">
          {hoursLabel} flight hours · {economics.profile.ownershipPercent.toFixed(1)}% equity
        </p>
      </div>
      <ul className="divide-y divide-atlas-border/30 px-4 py-1 text-sm">
        {economics.lines
          .filter((l) => l.label !== "Net annual owner cost")
          .map((line) => (
            <li key={line.label} className="flex justify-between gap-3 py-2">
              <span className="text-atlas-muted">{line.label}</span>
              <span className="font-mono tabular-nums">{formatCurrency(line.annual)}</span>
            </li>
          ))}
      </ul>
      <div className="border-t border-atlas-accent/35 bg-atlas-accent/10 px-4 py-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="atlas-proforma-line font-medium">Owner flight cost per hour</p>
            <p className="atlas-caption mt-0.5">
              {formatCurrency(Math.abs(economics.netAnnualOwnerCost))} net ÷ {hoursLabel} hrs
            </p>
          </div>
          <p className="font-mono text-xl tabular-nums text-atlas-accent">
            {hours > 0 ? formatCurrency(economics.costPerFlightHour) : "—"}
            <span className="ml-1 text-sm font-normal text-atlas-muted">/ hr</span>
          </p>
        </div>
      </div>
    </section>
  );
}

function ProFormaOwnerHourCostFooter({
  costPerHour,
  netAnnualOwnerCost,
  ownerFlightHours,
}: {
  costPerHour: number;
  netAnnualOwnerCost: number;
  ownerFlightHours: number;
}) {
  const hoursLabel =
    ownerFlightHours > 0 && Number.isFinite(ownerFlightHours)
      ? ownerFlightHours % 1 === 0
        ? `${ownerFlightHours}`
        : ownerFlightHours.toFixed(1)
      : "—";

  return (
    <div className="border-t border-atlas-accent/35 bg-atlas-accent/10 px-3 py-4 sm:px-4">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="atlas-proforma-line font-medium text-atlas-text">
            Owner flight cost per flight hour
          </p>
          <p className="atlas-caption mt-1 whitespace-nowrap">
            {formatCurrency(netAnnualOwnerCost)} net annual owner cost ÷ {hoursLabel} owner flight
            hours
          </p>
        </div>
        <p className="shrink-0 font-mono text-2xl tabular-nums tracking-tight text-atlas-accent sm:text-3xl">
          {ownerFlightHours > 0 ? formatCurrency(costPerHour) : "—"}
          <span className="ml-1 text-base font-normal text-atlas-muted">/ hr</span>
        </p>
      </div>
    </div>
  );
}

function PlRow({
  row,
  colMode,
  visible,
  onToggle,
}: {
  row: ProFormaStatementRow;
  colMode: ColMode;
  visible: boolean;
  onToggle: (key: string, visible: boolean) => void;
}) {
  const isTotal = row.kind === "subtotal" || row.kind === "total";
  const isLine = row.kind === "line";
  const amt = row.annual;
  const hidden = row.hidden || (isLine && row.toggleable && !visible);
  const showRateHours = colMode === "full";

  return (
    <div
      className={cn(
        COLS,
        "px-3 py-2 sm:px-4",
        isTotal && "bg-atlas-surface/35",
        hidden && isLine && "opacity-40"
      )}
    >
      <div className="flex shrink-0 justify-center">
        {isLine && row.toggleable ? (
          <ToggleButton visible={visible} onToggle={() => onToggle(row.key, !visible)} />
        ) : null}
      </div>

      <p
        title={row.label}
        className={cn(
          "atlas-proforma-line",
          isTotal ? "font-medium text-atlas-text" : "text-atlas-muted",
          hidden && isLine && "line-through"
        )}
      >
        {row.label}
      </p>

      {showRateHours ? (
        <>
          <p className="shrink-0 whitespace-nowrap text-right font-mono text-xs tabular-nums text-atlas-muted sm:text-sm">
            {isLine ? fmtRate(row.rate) : "—"}
          </p>
          <p className="shrink-0 whitespace-nowrap text-right font-mono text-xs tabular-nums text-atlas-muted sm:text-sm">
            {isLine || (isTotal && row.hours != null) ? fmtHours(row.hours) : "—"}
          </p>
        </>
      ) : (
        <>
          <span className="hidden sm:block" />
          <span className="hidden sm:block" />
        </>
      )}

      <p
        className={cn(
          "shrink-0 whitespace-nowrap text-right font-mono text-xs tabular-nums sm:text-sm",
          isTotal && "font-semibold text-atlas-accent",
          row.sign === "revenue" && amt != null && amt > 0 && "text-atlas-success",
          hidden && isLine && "text-atlas-muted/80"
        )}
      >
        {amt != null ? formatCurrency(amt) : "—"}
      </p>
    </div>
  );
}

function ToggleButton({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      title={visible ? "Exclude from totals" : "Include in totals"}
      aria-label={visible ? "Hide line" : "Show line"}
      onClick={onToggle}
      className={cn(
        "inline-flex h-6 w-6 items-center justify-center rounded border transition-colors",
        visible
          ? "border-atlas-accent/35 bg-atlas-accent/15 text-atlas-accent"
          : "border-atlas-border/50 text-atlas-muted hover:text-atlas-text"
      )}
    >
      {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
    </button>
  );
}

function fmtRate(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate) || rate === 0) return "—";
  return formatCurrency(rate);
}

function fmtHours(hours: number | null | undefined): string {
  if (hours == null || !Number.isFinite(hours) || hours <= 0) return "—";
  return hours % 1 === 0 ? `${hours}` : hours.toFixed(1);
}
