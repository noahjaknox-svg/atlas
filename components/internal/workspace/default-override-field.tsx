"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { getAssumptionRowState } from "@/lib/assumption-row-state";
import type { WorkspaceField } from "@/lib/workspace-sections";

function formatDefaultDisplay(field: WorkspaceField, raw: string): string {
  const v = raw.trim();
  if (!v) return "—";
  if (field.type === "number") {
    const n = parseFloat(v.replace(/,/g, ""));
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

  const isCalculated = Boolean(field.readOnly || calculatedValue !== undefined);
  const state = getAssumptionRowState({
    field,
    defaultValue,
    overrideDisplay: value,
    storedValue: storedValue || value,
    isCalculated,
  });

  const usingOverride = state === "overridden";
  const labelMuted = field.reference || field.demoted;

  const labelCell = (
    <p
      title={field.label}
      className={cn("atlas-config-label", labelMuted && "atlas-config-label-muted")}
    >
      {field.label}
      {field.required ? <span className="text-atlas-accent"> *</span> : null}
    </p>
  );

  if (isCalculated) {
    return (
      <div className="atlas-config-row atlas-config-row-calculated">
        {labelCell}
        <div className="atlas-config-col-value">
          <span className="atlas-config-value">—</span>
        </div>
        <div className="atlas-config-col-value">
          <span className="atlas-config-calc-pill" title="Calculated">
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
    hasOverride ? "atlas-config-input-override" : "text-atlas-muted/80 placeholder:italic placeholder:text-atlas-muted/60"
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
        >
          {defaultDisplay}
        </span>
      </div>
      <div className="atlas-config-col-value">
        {field.type === "textarea" ? (
          <textarea
            className={cn(inputCls, "min-h-[2.75rem] resize-none py-1 text-[12px]")}
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
        ) : (
          <input
            type={field.type === "number" ? "number" : "text"}
            className={inputCls}
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
  const o = override.trim();
  if (o) return o;
  return defaultValue.trim();
}
