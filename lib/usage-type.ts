import type { AssumptionMap } from "@/lib/assumptions";
import { normalizeUsageType } from "@/lib/aircraft-workspace";
import type { SectionProFormaRollup } from "@/lib/aircraft-tab-fields";
import type { AircraftTabGroup, AircraftTabSection } from "@/lib/aircraft-tab-fields";
import type { WorkspaceField } from "@/lib/workspace-sections";
import type { ProFormaStatementRow } from "@/lib/proforma-statement";

/** Part 91 + 135 charter; Part 91 owner-only. */
export function isCharterUsageEnabled(assumptions: AssumptionMap): boolean {
  return normalizeUsageType(assumptions) === "part_91_135";
}

/** Assumption keys used only when charter (135) is enabled. */
export const CHARTER_ASSUMPTION_KEYS = new Set([
  "charter_block_hours",
  "charter_flight_hours",
  "charter_rate",
  "charter_payback_pct",
  "fuel_surcharge",
  "pilot_charter_incentive_per_hour",
  "fet_treatment",
  "jet_fuel_tax_differential_per_gal",
]);

const CHARTER_PROFORMA_LINE_KEYS = new Set([
  "charter_revenue_block",
  "fuel_surcharge",
  "fet_refund",
  "total_net_revenue",
  "total_revenue",
  "util_available_charter",
  "util_charter_revenue_hours",
  "bridge_total_revenue",
  "bridge_charter_var",
  "total_charter_variable",
  "charter_fuel",
  "charter_parts",
  "charter_engine",
  "charter_apu",
  "charter_airframe",
  "charter_inspection",
  "charter_maintenance",
  "total_charter_flight",
]);

const CHARTER_PROFORMA_SECTIONS = new Set([
  "Revenue",
  "Charter Variable Costs",
  "Net Before Owner Use",
]);

export function isCharterAssumptionKey(name: string): boolean {
  return CHARTER_ASSUMPTION_KEYS.has(name);
}

export function isCharterProFormaRow(row: ProFormaStatementRow): boolean {
  if (row.kind === "section" && CHARTER_PROFORMA_SECTIONS.has(row.label)) {
    return true;
  }
  if (row.key && CHARTER_PROFORMA_LINE_KEYS.has(row.key)) {
    return true;
  }
  return row.label.toLowerCase().includes("(charter)");
}

export function fieldVisibleForUsage(
  field: WorkspaceField,
  assumptions: AssumptionMap
): boolean {
  if (field.charterOnly && !isCharterUsageEnabled(assumptions)) {
    return false;
  }
  const name = field.assumptionName;
  if (name && isCharterAssumptionKey(name) && !isCharterUsageEnabled(assumptions)) {
    return false;
  }
  return true;
}

export function groupVisibleForUsage(
  group: AircraftTabGroup,
  assumptions: AssumptionMap,
  fieldHidden: (field: WorkspaceField) => boolean
): boolean {
  if (group.charterOnly && !isCharterUsageEnabled(assumptions)) {
    return false;
  }
  return group.fields.some((f) => fieldVisibleForUsage(f, assumptions) && !fieldHidden(f));
}

export function sectionVisibleForUsage(
  section: AircraftTabSection,
  assumptions: AssumptionMap,
  fieldHidden: (field: WorkspaceField) => boolean
): boolean {
  if (section.charterOnly && !isCharterUsageEnabled(assumptions)) {
    return false;
  }
  return section.groups.some((g) => groupVisibleForUsage(g, assumptions, fieldHidden));
}

/** Owner-only rollup when Part 91; unchanged when 135. */
export function rollupForUsage(
  rollup: SectionProFormaRollup | undefined,
  assumptions: AssumptionMap
): SectionProFormaRollup | undefined {
  if (!rollup || isCharterUsageEnabled(assumptions)) return rollup;

  if (rollup.type === "line" && rollup.proformaLine?.startsWith("charter_")) {
    const ownerKey = rollup.proformaLine.replace(/^charter_/, "owner_");
    return { ...rollup, proformaLine: ownerKey, proformaLineOwner: undefined };
  }

  if (rollup.type === "lines" && rollup.proformaLines?.length) {
    const ownerLines = rollup.proformaLines
      .map((k) =>
        k === "total_charter_flight" || k === "total_charter_variable"
          ? "total_owner_variable"
          : k.startsWith("charter_")
            ? k.replace(/^charter_/, "owner_")
            : k
      )
      .filter((k) => k.startsWith("owner_") || k === "total_owner_flight");
    if (ownerLines.length === 0) return undefined;
    return {
      ...rollup,
      label: rollup.label.replace(/charter/gi, "owner").replace(/Charter/gi, "Owner"),
      proformaLines: Array.from(new Set(ownerLines)),
    };
  }

  if (rollup.proformaMetric === "charter_revenue" || rollup.proformaMetric === "fuel_surcharge") {
    return undefined;
  }

  if (rollup.type === "hourly" || rollup.type === "value") {
    return rollup;
  }

  return rollup;
}
