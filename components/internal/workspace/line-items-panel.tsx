"use client";

import { MoneyInput } from "@/components/ui/money-input";
import type { AssumptionMap } from "@/lib/assumptions";
import { isCustomLineItemKey, resolveLineCatalog } from "@/lib/line-item-catalog";

/**
 * Per-proposal values for the custom Line Items defined in Data Warehouse → Line Items.
 * Seeded from the aircraft type; edits here are kept when warehouse defaults are refreshed.
 */
export function LineItemsPanel({
  assumptions,
  onAssumptionsChange,
}: {
  assumptions: AssumptionMap;
  onAssumptionsChange: (next: AssumptionMap) => void;
}) {
  const items = resolveLineCatalog(assumptions).filter(
    (i) => i.active && isCustomLineItemKey(i.key)
  );
  if (items.length === 0) return null;

  return (
    <section className="atlas-workspace-section min-w-0" aria-label="Additional line items">
      <div className="atlas-workspace-section-header">
        <h3 className="atlas-panel-title">Additional line items</h3>
      </div>
      <div className="atlas-config-table" role="table">
        <div className="atlas-config-th" role="row">
          <span className="min-w-0 truncate">Line item</span>
          <span className="atlas-config-th-value" aria-hidden />
          <span className="atlas-config-th-override">Amount</span>
        </div>
        {items.map((item) => {
          const unit = item.kind === "hourly" ? "$/hr" : "$/yr";
          return (
            <div key={item.key} className="atlas-config-row items-center gap-2" role="row">
              <span className="min-w-0 truncate text-sm">
                {item.label} <span className="text-xs text-atlas-muted">({unit})</span>
              </span>
              <span aria-hidden className="min-w-0" />
              <MoneyInput
                value={assumptions[item.key] ?? ""}
                onChange={(raw) => onAssumptionsChange({ ...assumptions, [item.key]: raw })}
                currency
                className="atlas-input w-full min-w-[7rem] text-right font-mono tabular-nums"
                aria-label={`${item.label} ${unit}`}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
