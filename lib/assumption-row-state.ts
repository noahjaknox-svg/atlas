import { isCalculatedField } from "@/lib/aircraft-calculated-fields";
import type { WorkspaceField } from "@/lib/workspace-sections";

export type AssumptionRowState = "using_default" | "overridden" | "calculated" | "reference";

export function getAssumptionRowState(params: {
  field: WorkspaceField;
  defaultValue: string;
  /** Value shown in override column (empty when matching default) */
  overrideDisplay: string;
  /** Stored assumption value */
  storedValue: string;
  isCalculated: boolean;
}): AssumptionRowState {
  if (params.isCalculated || params.field.readOnly) return "calculated";
  if (params.field.proformaSource) return "calculated"; // labeled "Calculated" — value from Pro Forma
  if (params.field.reference) return "reference";
  if (params.field.demoted) return "reference";

  const def = params.defaultValue.trim();
  const override = params.overrideDisplay.trim();
  const stored = params.storedValue.trim();

  if (override) return "overridden";
  if (stored && def && stored !== def) return "overridden";
  if (stored && !def) return "overridden";

  return "using_default";
}

export const ROW_STATE_LABELS: Record<AssumptionRowState, string> = {
  using_default: "Using default",
  overridden: "Overridden",
  calculated: "Calculated",
  reference: "Reference",
};

export function isFieldEditableInAssumptionsTab(field: WorkspaceField): boolean {
  if (field.readOnly || field.proformaSource) return false;
  const name = field.assumptionName;
  if (name && isCalculatedField(name)) return false;
  return true;
}

export function rowMatchesOverrideFilter(
  state: AssumptionRowState,
  showOnlyOverridden: boolean
): boolean {
  if (!showOnlyOverridden) return true;
  return state === "overridden";
}
