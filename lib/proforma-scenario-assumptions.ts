import type { AssumptionMap } from "@/lib/assumptions";
import { parseFormattedNumber } from "@/lib/utils";
import { financingEnabledForScenarioMode, resolveFinancingScenarioMode } from "@/lib/financing-scenario";

/** Demo / portal scenario aircraft value — does not replace configurator `aircraft_value`. */
export const PROFORMA_AIRCRAFT_VALUE_KEY = "proforma_aircraft_value";

export const PROFORMA_FINANCING_ENABLED_KEY = "proforma_financing_enabled";
export const PROFORMA_DOWN_PAYMENT_PERCENT_KEY = "proforma_down_payment_percent";
export const PROFORMA_INTEREST_RATE_KEY = "proforma_interest_rate";
export const PROFORMA_TERM_MONTHS_KEY = "proforma_term_months";
export const PROFORMA_BALLOON_PAYMENT_KEY = "proforma_balloon_payment";

/** All demo-only scenario keys persisted via META autosave. */
export const PROFORMA_SCENARIO_ASSUMPTION_KEYS = [
  PROFORMA_AIRCRAFT_VALUE_KEY,
  PROFORMA_FINANCING_ENABLED_KEY,
  PROFORMA_DOWN_PAYMENT_PERCENT_KEY,
  PROFORMA_INTEREST_RATE_KEY,
  PROFORMA_TERM_MONTHS_KEY,
  PROFORMA_BALLOON_PAYMENT_KEY,
] as const;

const FINANCING_SCENARIO_OVERLAY: ReadonlyArray<[scenarioKey: string, configKey: string]> = [
  [PROFORMA_FINANCING_ENABLED_KEY, "financing_enabled"],
  [PROFORMA_DOWN_PAYMENT_PERCENT_KEY, "down_payment_percent"],
  [PROFORMA_INTEREST_RATE_KEY, "interest_rate"],
  [PROFORMA_TERM_MONTHS_KEY, "term_months"],
  [PROFORMA_BALLOON_PAYMENT_KEY, "balloon_payment"],
];

/** Configurator financing toggle derived from Financing tab mode only. */
export function configuratorFinancingEnabled(assumptions: AssumptionMap): "yes" | "no" {
  const mode = resolveFinancingScenarioMode(assumptions);
  return financingEnabledForScenarioMode(mode);
}

/** Overlay scenario aircraft value onto effective assumptions for pro forma math. */
export function applyProformaAircraftValueScenario(
  effective: AssumptionMap,
  raw: AssumptionMap
): AssumptionMap {
  const scenario = raw[PROFORMA_AIRCRAFT_VALUE_KEY]?.trim();
  if (!scenario) return effective;
  return { ...effective, aircraft_value: scenario };
}

/** Overlay demo financing scenario onto configurator effective assumptions. */
export function applyProformaFinancingScenario(
  effective: AssumptionMap,
  raw: AssumptionMap
): AssumptionMap {
  let out = { ...effective };
  for (const [scenarioKey, configKey] of FINANCING_SCENARIO_OVERLAY) {
    const scenario = raw[scenarioKey]?.trim();
    if (scenario) out = { ...out, [configKey]: scenario };
  }
  return out;
}

/** Apply all demo pro forma scenario overlays for statement math. */
export function applyProformaScenarioOverlays(
  effective: AssumptionMap,
  raw: AssumptionMap
): AssumptionMap {
  return applyProformaFinancingScenario(
    applyProformaAircraftValueScenario(effective, raw),
    raw
  );
}

function normalizeScenarioString(userValue: string, baseline: string): string {
  const parsed = parseFormattedNumber(userValue.trim());
  if (!parsed) return "";
  const userN = parseFloat(parsed);
  const baseParsed = parseFormattedNumber(baseline.trim());
  const baseN = parseFloat(baseParsed);
  if (Number.isFinite(baseN) && Math.round(userN) === Math.round(baseN)) {
    return "";
  }
  if (Number.isFinite(userN) && userN % 1 !== 0) {
    return String(userN);
  }
  return String(Math.round(userN));
}

/** Persist demo scenario edits without touching configurator baseline. */
export function normalizeProformaAircraftValueStorage(
  userValue: string,
  configuratorBaseline: string
): string {
  const parsed = parseFormattedNumber(userValue.trim());
  if (!parsed) return "";
  const n = parseFloat(parsed);
  if (!Number.isFinite(n) || n <= 0) return "";
  const baseN = parseFloat(parseFormattedNumber(configuratorBaseline));
  if (Number.isFinite(baseN) && Math.round(n) === Math.round(baseN)) {
    return "";
  }
  return String(Math.round(n));
}

export function normalizeProformaFinancingEnabledStorage(
  userEnabled: string | undefined,
  configuratorEnabled: "yes" | "no"
): string {
  const v = userEnabled?.trim();
  if (v !== "yes" && v !== "no") return "";
  if (v === configuratorEnabled) return "";
  return v;
}

export function normalizeProformaFinancingFieldStorage(
  userValue: string | undefined,
  configuratorBaseline: string
): string {
  return normalizeScenarioString(userValue ?? "", configuratorBaseline);
}

/** Build scenario-key patch from demo financing panel edits. */
export function proformaFinancingScenarioPatch(
  next: AssumptionMap,
  configuratorBaseline: AssumptionMap
): Partial<AssumptionMap> {
  const patch: Partial<AssumptionMap> = {};
  const configEnabled = configuratorFinancingEnabled(configuratorBaseline);

  const enabledStorage = normalizeProformaFinancingEnabledStorage(
    next.financing_enabled,
    configEnabled
  );
  if (enabledStorage) {
    patch[PROFORMA_FINANCING_ENABLED_KEY] = enabledStorage;
  } else {
    patch[PROFORMA_FINANCING_ENABLED_KEY] = "";
  }

  const fieldPairs: Array<[scenarioKey: string, configKey: string]> = [
    [PROFORMA_DOWN_PAYMENT_PERCENT_KEY, "down_payment_percent"],
    [PROFORMA_INTEREST_RATE_KEY, "interest_rate"],
    [PROFORMA_TERM_MONTHS_KEY, "term_months"],
    [PROFORMA_BALLOON_PAYMENT_KEY, "balloon_payment"],
  ];

  for (const [scenarioKey, configKey] of fieldPairs) {
    const stored = normalizeProformaFinancingFieldStorage(
      next[configKey],
      configuratorBaseline[configKey] ?? ""
    );
    patch[scenarioKey] = stored;
  }

  if (next.aircraft_value !== undefined) {
    patch[PROFORMA_AIRCRAFT_VALUE_KEY] = normalizeProformaAircraftValueStorage(
      next.aircraft_value ?? "",
      configuratorBaseline.aircraft_value ?? ""
    );
  }

  return patch;
}
