"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { MODEL_COMPARISON_PRESETS } from "@/lib/aircraft-workspace";
import { assumptionsToProFormaInputs, calculateProForma } from "@/lib/proforma";
import type { AssumptionMap } from "@/lib/assumptions";

function breakEvenHours(inputs: ReturnType<typeof assumptionsToProFormaInputs>): number | null {
  const rate = inputs.charterRate * (inputs.charterPaybackPct / 100);
  const varHr =
    inputs.fuelBurnGph *
      (inputs.homeFuelPrice * (inputs.homeFuelPct / 100) +
        inputs.awayFuelPrice * (1 - inputs.homeFuelPct / 100)) +
    inputs.engineProgramRate +
    inputs.apuProgramRate +
    inputs.partsProgramRate +
    inputs.inspectionReserveRate +
    inputs.maintenanceReserveRate;
  const denom = rate - varHr;
  if (denom <= 0) return null;
  return Math.ceil(inputs.totalFixedCosts / denom);
}

export function ModelComparisonPanel({
  assumptions,
  displayName,
}: {
  assumptions: AssumptionMap;
  displayName: string;
}) {
  const rows = useMemo(() => {
    return MODEL_COMPARISON_PRESETS.map((preset) => {
      const merged = {
        ...assumptions,
        operating_model: preset.operatingModel,
        ...(preset.label.includes("91 Only")
          ? { charter_block_hours: "0", charter_flight_hours: "0" }
          : preset.label.includes("Charter-Heavy")
            ? { charter_block_hours: "400", charter_flight_hours: "450" }
            : {}),
      };
      const inputs = assumptionsToProFormaInputs(merged);
      const result = calculateProForma(inputs);
      const charterOffset = result.totalRevenue;
      return {
        label: preset.label,
        netAnnual: result.netAnnualCost,
        netMonthly: result.netMonthlyCost,
        charterOffset,
        costPerHour: result.costPerOwnerHour,
        breakEven: breakEvenHours(inputs),
      };
    });
  }, [assumptions]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
      <h1 className="font-serif text-2xl text-atlas-text">Model Comparison</h1>
      <p className="mt-1 text-sm text-atlas-muted">
        {displayName} — side-by-side using current assumptions per operating model preset.
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-atlas-border text-left text-xs uppercase tracking-wider text-atlas-muted">
              <th className="py-2 pr-4">Metric</th>
              {rows.map((r) => (
                <th key={r.label} className="py-2 px-3 font-medium text-atlas-text">
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            <ComparisonRow label="Net annual cost" values={rows.map((r) => formatCurrency(r.netAnnual))} />
            <ComparisonRow label="Net monthly cost" values={rows.map((r) => formatCurrency(r.netMonthly))} />
            <ComparisonRow
              label="Charter revenue offset"
              values={rows.map((r) => formatCurrency(r.charterOffset))}
            />
            <ComparisonRow
              label="Cost per owner hour"
              values={rows.map((r) => formatCurrency(r.costPerHour))}
            />
            <ComparisonRow
              label="Break-even charter hrs"
              values={rows.map((r) => (r.breakEven != null ? String(r.breakEven) : "—"))}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ComparisonRow({ label, values }: { label: string; values: string[] }) {
  return (
    <tr className="border-b border-atlas-border/60">
      <td className="py-3 pr-4 text-atlas-muted">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="py-3 px-3 text-atlas-text">
          {v}
        </td>
      ))}
    </tr>
  );
}
