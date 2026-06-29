"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatFormattedNumber, parseFormattedNumber } from "@/lib/utils";
import { MoneyInput, moneyInputClassName } from "@/components/ui/money-input";
import { getAssumptionRowState } from "@/lib/assumption-row-state";
import type { WorkspaceField } from "@/lib/workspace-sections";

function formatDefaultDisplay(field: WorkspaceField, raw: string): string {
  const v = raw.trim();
  if (!v) return "—";
  if (field.type === "currency") {
    const n = parseFloat(parseFormattedNumber(v));
    return Number.isFinite(n) ? formatCurrency(n) : "—";
  }
  if (field.type === "number") {
    const n = parseFloat(parseFormattedNumber(v));
    if (Number.isFinite(n)) {
      return n % 1 === 0 ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
    }
  }
  return v;
}

export const DefaultOverrideField = memo(function DefaultOverrideField({
  field,
  defaultValue,
  value,
  onChange,
  calculatedValue,
  storedValue = "",
  hidden,
}: {
  field: WorkspaceField;
  defaultValue: string;
  value: string;
  onChange: (value: string) => void;
  calculatedValue?: string;
  storedValue?: string;
  hidden?: boolean;
}) {
  if (hidden) return null;

  const labelMuted = field.demoted;
  const labelCell = (
    <p
      title={field.label}
      className={cn("atlas-config-label", labelMuted && "atlas-config-label-muted")}
    >
      {field.label}
      {field.required ? <span className="text-atlas-accent"> *</span> : null}
    </p>
  );

  if (field.warehouseDefaultOnly) {
    const display = formatDefaultDisplay(field, defaultValue);
    return (
      <div className="atlas-config-row">
        {labelCell}
        <div className="atlas-config-col-value">
          <span
            className={cn(
              "atlas-config-value",
              display !== "—" && "atlas-config-value-active"
            )}
            title={display !== "—" ? display : undefined}
          >
            {display}
          </span>
        </div>
        <div className="atlas-config-col-value">
          <span className="atlas-config-use-default">Data Warehouse · Average Cost</span>
        </div>
      </div>
    );
  }

  const isCalculated = Boolean(field.readOnly || calculatedValue !== undefined);
  const state = getAssumptionRowState({
    field,
    defaultValue,
    overrideDisplay: value,
    storedValue: storedValue || value,
    isCalculated,
  });

  const usingOverride = state === "overridden";

  if (isCalculated) {
    return (
      <div className="atlas-config-row atlas-config-row-calculated">
        {labelCell}
        <div className="atlas-config-col-value">
          <span className="atlas-config-value">—</span>
        </div>
        <div className="atlas-config-col-value">
          <span className="atlas-config-calc-pill" title={calculatedValue ?? undefined}>
            {calculatedValue ?? "—"}
          </span>
        </div>
      </div>
    );
  }

  const defaultDisplay = formatDefaultDisplay(field, defaultValue);
  const hasOverride = Boolean(value.trim());

  const inputCls = cn(
    "atlas-config-input",
    hasOverride ? "atlas-config-input-override" : "text-atlas-muted/90"
  );

  return (
    <div className="atlas-config-row">
      {labelCell}
      <div className="atlas-config-col-value">
        <span
          className={cn(
            "atlas-config-value",
            !usingOverride && defaultDisplay !== "—" && "atlas-config-value-active"
          )}
          title={defaultDisplay !== "—" ? defaultDisplay : undefined}
        >
          {defaultDisplay}
        </span>
      </div>
      <div className="atlas-config-col-value">
        {field.type === "textarea" ? (
          <textarea
            className={cn(inputCls, "min-h-[2.75rem] w-full max-w-none resize-none py-1.5 text-left text-sm")}
            value={value}
            placeholder="Use default."
            onChange={(e) => onChange(e.target.value)}
          />
        ) : field.type === "select" && field.options ? (
          <select
            className={cn("atlas-config-select", hasOverride && "atlas-config-input-override")}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Use default.</option>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : field.type === "currency" ? (
          <MoneyInput
            className={cn(moneyInputClassName(hasOverride), "w-full min-w-0 max-w-none")}
            value={value}
            currency
            placeholder="Use default."
            onChange={onChange}
          />
        ) : (
          <input
            type={field.type === "number" ? "number" : "text"}
            className={cn(inputCls, "w-full max-w-none")}
            value={value}
            placeholder="Use default."
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </div>
    </div>
  );
});

export function effectiveFieldValue(defaultValue: string, override: string): string {
  const o = parseFormattedNumber(override.trim());
  if (o) return o;
  return defaultValue.trim();
}

/** Value shown in the override column (empty when stored matches warehouse default). */
export function assumptionOverrideDisplay(stored: string, defaultValue: string): string {
  const d = defaultValue.trim();
  const v = stored.trim();
  if (!v) return "";
  if (d && v === d) return "";
  return stored;
}

/** Effective value for calculations and pro forma inputs. */
export function resolvedAssumptionDisplay(stored: string, defaultValue: string): string {
  return effectiveFieldValue(defaultValue, assumptionOverrideDisplay(stored, defaultValue));
}

/** Persist a full effective display value back to stored assumptions. */
export function storeAssumptionFromEffectiveDisplay(
  effectiveDisplay: string,
  defaultValue: string
): string {
  const parsed = parseFormattedNumber(effectiveDisplay.trim());
  if (!parsed) return effectiveFieldValue(defaultValue, "");
  const n = parseFloat(parsed);
  const defN = parseFloat(parseFormattedNumber(defaultValue));
  if (Number.isFinite(defN) && Math.round(n) === Math.round(defN)) {
    return effectiveFieldValue(defaultValue, "");
  }
  return String(Math.round(n));
}
