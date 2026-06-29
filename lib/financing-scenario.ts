import type { AssumptionMap } from "@/lib/assumptions";

export const FINANCING_SCENARIO_MODE_OPTIONS = [
  { value: "show_default", label: "Show financing by default" },
  { value: "hide_default", label: "Hide financing by default" },
  { value: "remove", label: "Remove financing" },
] as const;

export type FinancingScenarioMode = (typeof FINANCING_SCENARIO_MODE_OPTIONS)[number]["value"];

export function normalizeFinancingScenarioMode(
  raw: string | undefined | null
): FinancingScenarioMode {
  const v = String(raw ?? "").trim();
  if (v === "show_default" || v === "hide_default" || v === "remove") return v;
  return "hide_default";
}

export function resolveFinancingScenarioMode(assumptions: AssumptionMap): FinancingScenarioMode {
  return normalizeFinancingScenarioMode(assumptions.financing_scenario_mode);
}

export function isFinancingScenarioRemoved(mode: FinancingScenarioMode): boolean {
  return mode === "remove";
}

export function defaultFinancingEnabledForMode(mode: FinancingScenarioMode): boolean {
  return mode === "show_default";
}

/** Whether the financing scenario block should render on demo / portal pro forma. */
export function isFinancingScenarioVisible(assumptions: AssumptionMap): boolean {
  return !isFinancingScenarioRemoved(resolveFinancingScenarioMode(assumptions));
}

/** Initial toggle state from Financing tab mode (configurator baseline). */
export function resolveInitialFinancingEnabled(assumptions: AssumptionMap): boolean {
  const mode = resolveFinancingScenarioMode(assumptions);
  if (mode === "remove") return false;
  return defaultFinancingEnabledForMode(mode);
}

export function financingEnabledForScenarioMode(mode: FinancingScenarioMode): "yes" | "no" {
  return defaultFinancingEnabledForMode(mode) ? "yes" : "no";
}

/** Apply mode-based financing_enabled for calculations (ignores stale stored toggles). */
export function assumptionsWithFinancingDefault(a: AssumptionMap): AssumptionMap {
  return {
    ...a,
    financing_enabled: resolveInitialFinancingEnabled(a) ? "yes" : "no",
  };
}

export function financingScenarioModeLabel(mode: FinancingScenarioMode): string {
  return (
    FINANCING_SCENARIO_MODE_OPTIONS.find((o) => o.value === mode)?.label ?? mode.replace(/_/g, " ")
  );
}
