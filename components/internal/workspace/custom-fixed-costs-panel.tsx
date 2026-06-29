"use client";

import { Plus, Trash2 } from "lucide-react";
import { MoneyInput } from "@/components/ui/money-input";
import type { AssumptionMap } from "@/lib/assumptions";
import {
  createProformaCustomFixedCostId,
  parseProformaCustomFixedCostsStored,
  PROFORMA_CUSTOM_FIXED_COSTS_KEY,
  serializeProformaCustomFixedCosts,
  sumProformaCustomFixedCosts,
  type ProformaCustomFixedCostItem,
} from "@/lib/proforma-custom-fixed-costs";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

function patchItems(assumptions: AssumptionMap, items: ProformaCustomFixedCostItem[]): AssumptionMap {
  const serialized = serializeProformaCustomFixedCosts(items);
  return {
    ...assumptions,
    [PROFORMA_CUSTOM_FIXED_COSTS_KEY]: serialized,
  };
}

export function CustomFixedCostsPanel({
  assumptions,
  onAssumptionsChange,
}: {
  assumptions: AssumptionMap;
  onAssumptionsChange: (next: AssumptionMap) => void;
}) {
  const items = parseProformaCustomFixedCostsStored(assumptions);
  const total = sumProformaCustomFixedCosts(items);

  function updateItem(id: string, patch: Partial<Pick<ProformaCustomFixedCostItem, "name" | "amount">>) {
    const next = items.map((item) => (item.id === id ? { ...item, ...patch } : item));
    onAssumptionsChange(patchItems(assumptions, next));
  }

  function removeItem(id: string) {
    onAssumptionsChange(
      patchItems(
        assumptions,
        items.filter((item) => item.id !== id)
      )
    );
  }

  function addItem() {
    onAssumptionsChange(
      patchItems(assumptions, [
        ...items,
        { id: createProformaCustomFixedCostId(), name: "", amount: 0 },
      ])
    );
  }

  return (
    <section className="atlas-workspace-section min-w-0">
      <div className="atlas-workspace-section-header">
        <h3 className="atlas-panel-title">Custom fixed costs</h3>
      </div>

      <div className="atlas-config-table py-1" role="table">
        <div className="atlas-config-th" role="row">
          <span className="min-w-0 truncate">Line item</span>
          <span className="atlas-config-th-value" aria-hidden />
          <span className="atlas-config-th-override">Annual amount</span>
        </div>

        {items.length === 0 ? (
          <p className="px-4 py-3 text-sm text-atlas-muted">
            Add optional line items that appear on the pro forma fixed costs section and client
            portal.
          </p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="atlas-config-row items-center gap-2" role="row">
              <input
                type="text"
                className="atlas-input min-w-0 flex-1"
                value={item.name}
                placeholder="Name"
                aria-label="Custom fixed cost name"
                onChange={(e) => updateItem(item.id, { name: e.target.value })}
              />
              <span aria-hidden className="min-w-0" />
              <div className="flex min-w-0 items-center gap-2">
                <MoneyInput
                  value={item.amount > 0 ? String(item.amount) : ""}
                  onChange={(raw) => {
                    const amount = parseFloat(raw) || 0;
                    updateItem(item.id, { amount });
                  }}
                  currency
                  className="atlas-input w-full min-w-[7rem] text-right font-mono tabular-nums"
                  aria-label={`${item.name || "Custom fixed cost"} annual amount`}
                />
                <button
                  type="button"
                  className="inline-flex shrink-0 rounded p-1.5 text-atlas-muted hover:bg-atlas-border/30 hover:text-atlas-text"
                  onClick={() => removeItem(item.id)}
                  aria-label={`Remove ${item.name || "custom fixed cost"}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}

        <div className="border-t border-atlas-border/40 px-4 py-3">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-atlas-accent hover:text-atlas-accent/80"
            onClick={addItem}
          >
            <Plus className="h-4 w-4" />
            Add line item
          </button>
        </div>

        {total > 0 ? (
          <div
            className={cn(
              "border-t font-medium",
              "border-atlas-accent/20 bg-atlas-accent/[0.06]"
            )}
          >
            <div className="atlas-config-row" role="row">
              <span className="min-w-0 truncate text-[10px] uppercase tracking-wide text-atlas-accent">
                Custom fixed costs total
              </span>
              <span aria-hidden className="min-w-0" />
              <div className="atlas-config-col-value">
                <span className="atlas-config-calc-pill border-atlas-accent/40 text-[13px]">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
