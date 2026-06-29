"use client";

import { memo } from "react";
import {
  DefaultOverrideField,
  effectiveFieldValue,
} from "@/components/internal/workspace/default-override-field";
import { isCalculatedField } from "@/lib/aircraft-calculated-fields";
import { computeSectionProFormaTotal } from "@/lib/section-proforma-totals";
import { calculatedAssumptionAmount } from "@/lib/resolve-effective-assumptions";
import type { AircraftTabGroup, AircraftTabSection } from "@/lib/aircraft-tab-fields";
import type { WorkspaceField } from "@/lib/workspace-sections";
import type { AssumptionMap } from "@/lib/assumptions";
import { isFieldEditableInAssumptionsTab } from "@/lib/assumption-row-state";
import { groupVisibleForUsage, rollupForUsage } from "@/lib/usage-type";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

function shouldShowGroupHeader(group: AircraftTabGroup, rows: WorkspaceField[]): boolean {
  if (rows.length !== 1) return true;
  if (!group.proFormaRollup) return false;
  return group.proFormaRollup.type !== "line";
}

function shouldShowGroupFooter(group: AircraftTabGroup, rows: WorkspaceField[]): boolean {
  if (rows.length !== 1) return true;
  return group.proFormaRollup?.type !== "line";
}

function ConfigTableHeader() {
  return (
    <div className="atlas-config-th" role="row">
      <span className="min-w-0 truncate">Field</span>
      <span
        className="atlas-config-th-value"
        title="Pulled — live Data Warehouse reference for comparison. Override — your saved copy for this proposal."
      >
        Pulled
      </span>
      <span
        className="atlas-config-th-override"
        title="Values you enter here are saved on this proposal and preserved on warehouse refresh."
      >
        Override
      </span>
    </div>
  );
}

function formatCalculatedDisplay(name: string, effective: AssumptionMap): string {
  const amount = calculatedAssumptionAmount(effective, name);
  if (amount == null) return "—";
  if (
    name.includes("total") ||
    name.includes("annual") ||
    name.includes("hour") ||
    name === "monthly_debt_service" ||
    name === "blended_fuel_price" ||
    name === "fet_refund_amount" ||
    name === "jet_fuel_tax_credit_per_hour" ||
    name === "registration_annual"
  ) {
    if (name === "blended_fuel_price") return `$${amount.toFixed(2)}/gal`;
    if (name.includes("hour") && !name.includes("total")) {
      return formatCurrency(amount) + "/hr";
    }
    return formatCurrency(amount);
  }
  return String(amount);
}

function formatScenarioHours(raw: string | undefined): string {
  const n = parseFloat(raw ?? "");
  if (!Number.isFinite(n)) return "—";
  return `${n % 1 === 0 ? n : n.toFixed(1)} hrs`;
}

function resolvedDisplayValue(
  field: WorkspaceField,
  effective: AssumptionMap,
  defaults: Record<string, string>
): string | undefined {
  const name = field.assumptionName!;
  if (field.proformaSource) {
    const v = effective[name]?.trim();
    if (v) {
      if (name.includes("hour")) return formatScenarioHours(v);
      return v;
    }
    const d = defaults[name]?.trim();
    if (d) return name.includes("hour") ? formatScenarioHours(d) : d;
    return "—";
  }
  if (isCalculatedField(name, effective)) return formatCalculatedDisplay(name, effective);
  return undefined;
}

function ConfigTableFooter({
  total,
  prominent,
}: {
  total: { label: string; formatted: string; proFormaHint?: string };
  prominent?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-t font-medium",
        prominent
          ? "border-atlas-accent/35 bg-atlas-accent/10"
          : "border-atlas-accent/20 bg-atlas-accent/[0.06]"
      )}
    >
      <div className="atlas-config-row" role="row">
        <span
          className={cn(
            "min-w-0 truncate uppercase tracking-wide text-atlas-accent",
            prominent ? "text-[11px]" : "text-[10px]"
          )}
        >
          {total.label}
        </span>
        <span aria-hidden className="min-w-0" />
        <div className="atlas-config-col-value">
          <span
            className={cn(
              "atlas-config-calc-pill border-atlas-accent/40",
              prominent ? "text-sm" : "text-[13px]"
            )}
          >
            {total.formatted}
          </span>
        </div>
      </div>
      {total.proFormaHint ? (
        <p className="border-t border-atlas-border/10 px-4 py-2 text-right text-xs leading-snug text-atlas-muted">
          {total.proFormaHint}
        </p>
      ) : null}
    </div>
  );
}

function renderFieldRow(
  field: WorkspaceField,
  defaults: Record<string, string>,
  assumptions: AssumptionMap,
  effective: AssumptionMap,
  onOverride: (name: string, raw: string) => void
) {
  const name = field.assumptionName!;
  const def = defaults[name]?.trim() ?? "";
  const stored = assumptions[name] ?? "";
  const override = (() => {
    const d = def.trim();
    const v = stored.trim();
    if (!v) return "";
    if (d && v === d) return "";
    return stored;
  })();
  const scenarioVal = resolvedDisplayValue(field, effective, defaults);
  const readOnlyValue =
    field.readOnly && !isCalculatedField(name, effective)
      ? effective[name]?.trim() || undefined
      : undefined;
  const calcVal =
    scenarioVal ??
    readOnlyValue ??
    (isCalculatedField(name, effective) ? formatCalculatedDisplay(name, effective) : undefined);
  const readOnlyScenario = field.proformaSource;

  return (
    <DefaultOverrideField
      key={name}
      field={{
        ...field,
        readOnly: field.readOnly || readOnlyScenario || isCalculatedField(name, effective),
        proformaSource: field.proformaSource || readOnlyScenario,
      }}
      defaultValue={def}
      value={override}
      storedValue={assumptions[name]}
      calculatedValue={calcVal}
      onChange={(v) => {
        if (field.warehouseDefaultOnly) return;
        if (!isFieldEditableInAssumptionsTab(field) || readOnlyScenario) return;
        onOverride(name, v);
      }}
    />
  );
}

export const AssumptionsSectionTable = memo(function AssumptionsSectionTable({
  section,
  defaults,
  assumptions,
  effective,
  fieldHidden,
  onOverride,
}: {
  section: AircraftTabSection;
  defaults: Record<string, string>;
  assumptions: AssumptionMap;
  effective: AssumptionMap;
  fieldHidden: (field: WorkspaceField) => boolean;
  onOverride: (name: string, raw: string) => void;
  charterEnabled?: boolean;
}) {
  const visibleGroups = section.groups.filter((g) =>
    groupVisibleForUsage(g, assumptions, fieldHidden)
  );
  if (visibleGroups.length === 0) return null;

  const sectionTotal =
    section.hideProFormaRollup
      ? null
      : computeSectionProFormaTotal(
          rollupForUsage(section.proFormaRollup, assumptions),
          effective
        );

  return (
    <section className="atlas-workspace-section min-w-0">
      <div className="atlas-workspace-section-header">
        <h3 className="atlas-panel-title truncate">{section.title}</h3>
      </div>

      <div className="atlas-config-table py-1" role="table">
        <ConfigTableHeader />

        {visibleGroups.map((group) => {
          const rows = group.fields.filter((f) => !fieldHidden(f));
          if (rows.length === 0) return null;

          const groupTotal = section.hideProFormaRollup
            ? null
            : computeSectionProFormaTotal(
                rollupForUsage(group.proFormaRollup, assumptions),
                effective
              );
          const isProForma = group.title.toLowerCase().includes("pro forma");
          const showHeader = shouldShowGroupHeader(group, rows);
          const showFooter = groupTotal && shouldShowGroupFooter(group, rows);

          return (
            <div key={group.title} className="min-w-0" role="rowgroup">
              {showHeader ? (
                <div
                  className={cn(
                    "atlas-config-group-header",
                    isProForma && "bg-atlas-accent/10 text-atlas-accent"
                  )}
                  role="row"
                >
                  {group.title}
                </div>
              ) : null}

              {rows.map((field) =>
                renderFieldRow(field, defaults, assumptions, effective, onOverride)
              )}

              {showFooter ? <ConfigTableFooter total={groupTotal!} /> : null}
            </div>
          );
        })}

        {sectionTotal ? <ConfigTableFooter total={sectionTotal} prominent /> : null}
      </div>
    </section>
  );
});

export { effectiveFieldValue };
