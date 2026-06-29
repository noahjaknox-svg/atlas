"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { AssumptionMap } from "@/lib/assumptions";
import {
  computeDerivedAssumptions,
  computeMonthlyDebtService,
} from "@/lib/aircraft-calculated-fields";
import { resolveFinancingAmounts } from "@/lib/financing-assumptions";
import { cn, formatCurrency } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";

function num(v: string | undefined, fallback = 0): number {
  const n = parseFloat(v ?? "");
  return Number.isFinite(n) ? n : fallback;
}

export function ProFormaFinancingPanel({
  assumptions,
  onChange,
  variant = "workspace",
  defaultOpen = false,
  allowAircraftValueEdit = false,
}: {
  assumptions: AssumptionMap;
  onChange: (next: AssumptionMap) => void;
  variant?: "workspace" | "portal";
  defaultOpen?: boolean;
  /** Demo pro forma — edit aircraft value that drives loan math. */
  allowAircraftValueEdit?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const enabled = assumptions.financing_enabled === "yes";
  const portal = variant === "portal";

  const derived = useMemo(() => {
    if (!enabled) return null;
    const withDerived = { ...assumptions, ...computeDerivedAssumptions(assumptions) } as AssumptionMap;
    const amounts = resolveFinancingAmounts(withDerived);
    const monthly = computeMonthlyDebtService(withDerived);
    return { ...amounts, monthly: monthly ?? 0 };
  }, [assumptions, enabled]);

  function patch(partial: Partial<AssumptionMap>) {
    onChange({ ...assumptions, ...partial } as AssumptionMap);
  }

  const inputClass = portal
    ? "mt-1 w-full rounded border border-white/20 bg-white/10 px-3 py-2 font-mono text-sm text-white backdrop-blur focus:border-atlas-accent focus:outline-none focus:ring-1 focus:ring-atlas-accent/30"
    : "mt-1 atlas-input font-mono tabular-nums";

  const labelClass = portal ? "text-sm text-white/70" : "atlas-label";
  const captionClass = portal ? "text-xs text-white/50" : "atlas-caption text-atlas-muted";
  const summaryClass = portal
    ? "font-mono text-sm tabular-nums text-white"
    : "font-mono text-sm tabular-nums text-atlas-text";
  const readOnlyClass = portal
    ? "font-mono text-sm tabular-nums text-atlas-accent"
    : "font-mono text-sm tabular-nums text-atlas-accent";

  const containerClass = portal
    ? "rounded-lg border border-white/15 bg-white/5"
    : "border-b border-atlas-border/50";

  return (
    <div className={containerClass}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-start gap-2 px-4 py-3 text-left transition-colors",
          !portal && "hover:bg-atlas-surface/40"
        )}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-atlas-muted" />
        ) : (
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-atlas-muted" />
        )}
        <div className="min-w-0 flex-1">
          <p className={labelClass}>Financing</p>
          <p className={cn("mt-1", summaryClass)}>
            {enabled && derived
              ? `${formatCurrency(derived.monthly)}/mo · ${formatCurrency(derived.loanAmount)} loan`
              : "Not included"}
          </p>
          {!portal ? (
            <p className={cn("mt-1", captionClass)}>
              {enabled
                ? "Reference only — not on operating P&L"
                : "Enable to model loan payments from aircraft value"}
            </p>
          ) : null}
        </div>
      </button>

      {open ? (
        <div
          className={cn(
            "space-y-4 border-t px-4 py-4",
            portal ? "border-white/10" : "border-atlas-border/40"
          )}
        >
          {allowAircraftValueEdit ? (
            <div>
              <Label htmlFor="pf-aircraft-value" className={labelClass}>
                Aircraft value
              </Label>
              <MoneyInput
                id="pf-aircraft-value"
                value={assumptions.aircraft_value ?? ""}
                onChange={(v) => patch({ aircraft_value: v })}
                className={cn(inputClass, "text-right")}
              />
              <p className={cn("mt-1", captionClass)}>
                Scenario-only — does not change the Financing tab default or override.
              </p>
            </div>
          ) : null}

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) =>
                patch({ financing_enabled: e.target.checked ? "yes" : "no" })
              }
              className="h-4 w-4 rounded border-atlas-border accent-atlas-accent"
            />
            <span className={portal ? "text-sm text-white/80" : "text-sm text-atlas-text"}>
              Include financing
            </span>
          </label>

          {enabled ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="fin-down-pct" className={labelClass}>
                    Down payment (%)
                  </Label>
                  <Input
                    id="fin-down-pct"
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={assumptions.down_payment_percent ?? ""}
                    onChange={(e) => patch({ down_payment_percent: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <Label htmlFor="fin-rate" className={labelClass}>
                    Interest rate (%)
                  </Label>
                  <Input
                    id="fin-rate"
                    type="number"
                    min={0}
                    step={0.01}
                    value={assumptions.interest_rate ?? ""}
                    onChange={(e) => patch({ interest_rate: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <Label htmlFor="fin-term" className={labelClass}>
                    Term (months)
                  </Label>
                  <Input
                    id="fin-term"
                    type="number"
                    min={1}
                    step={1}
                    value={assumptions.term_months ?? ""}
                    onChange={(e) => patch({ term_months: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <Label htmlFor="fin-balloon" className={labelClass}>
                    Balloon payment ($)
                  </Label>
                  {portal ? (
                    <MoneyInput
                      id="fin-balloon"
                      value={assumptions.balloon_payment ?? ""}
                      onChange={(v) => patch({ balloon_payment: v })}
                      className={inputClass}
                    />
                  ) : (
                    <Input
                      id="fin-balloon"
                      type="number"
                      min={0}
                      step={1}
                      value={assumptions.balloon_payment ?? ""}
                      onChange={(e) => patch({ balloon_payment: e.target.value })}
                      className={inputClass}
                    />
                  )}
                </div>
              </div>

              {derived ? (
                <dl className="grid gap-2 rounded-md border border-atlas-border/30 bg-atlas-surface/20 px-3 py-3 sm:grid-cols-3">
                  <div>
                    <dt className={captionClass}>Down payment</dt>
                    <dd className={readOnlyClass}>{formatCurrency(derived.downPayment)}</dd>
                  </div>
                  <div>
                    <dt className={captionClass}>Loan amount</dt>
                    <dd className={readOnlyClass}>{formatCurrency(derived.loanAmount)}</dd>
                  </div>
                  <div>
                    <dt className={captionClass}>Monthly payment</dt>
                    <dd className={readOnlyClass}>{formatCurrency(derived.monthly)}</dd>
                  </div>
                </dl>
              ) : num(assumptions.aircraft_value) <= 0 ? (
                <p className={captionClass}>Set aircraft value to calculate loan amounts.</p>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
