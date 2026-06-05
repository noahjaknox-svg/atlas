import type { AssumptionMap } from "@/lib/assumptions";

function num(v: string | undefined, fallback = 0): number {
  const n = parseFloat(v ?? "");
  return Number.isFinite(n) ? n : fallback;
}

/** UI label — pro forma & configurator. */
export const JET_FUEL_TAX_DIFFERENTIAL_CREDIT_LABEL = "Jet Fuel Tax Differential Credit";

/** Default $/gal differential (noncommercial $0.219 − commercial $0.044). */
export const DEFAULT_JET_FUEL_TAX_DIFFERENTIAL_PER_GAL = 0.175;

export const JET_FUEL_TAX_DIFFERENTIAL_KEY = "jet_fuel_tax_differential_per_gal";
export const JET_FUEL_TAX_CREDIT_PER_HOUR_KEY = "jet_fuel_tax_credit_per_hour";

export function resolveJetFuelTaxDifferentialPerGal(assumptions: AssumptionMap): number {
  const n = num(assumptions[JET_FUEL_TAX_DIFFERENTIAL_KEY], DEFAULT_JET_FUEL_TAX_DIFFERENTIAL_PER_GAL);
  return n > 0 ? n : DEFAULT_JET_FUEL_TAX_DIFFERENTIAL_PER_GAL;
}

export type JetFuelTaxCreditInputs = {
  /** Available charter flight hours (not block/revenue hours). */
  charterFlightHours: number;
  fuelBurnGph: number;
};

/** Hourly credit = fuel burn GPH × differential $/gal. */
export function jetFuelTaxCreditPerHour(
  assumptions: AssumptionMap,
  fuelBurnGph: number
): number {
  if (fuelBurnGph <= 0) return 0;
  return fuelBurnGph * resolveJetFuelTaxDifferentialPerGal(assumptions);
}

/** Total charter gallons burned annually. */
export function charterGallonsBurned(inputs: JetFuelTaxCreditInputs): number {
  const { charterFlightHours, fuelBurnGph } = inputs;
  if (charterFlightHours <= 0 || fuelBurnGph <= 0) return 0;
  return fuelBurnGph * charterFlightHours;
}

/**
 * Annual jet fuel tax differential credit (before treatment).
 * Hourly refund × charter flight hours = GPH × differential × charter flight hours.
 */
export function jetFuelTaxCreditAnnualBase(
  assumptions: AssumptionMap,
  fuel: JetFuelTaxCreditInputs
): number {
  return jetFuelTaxCreditPerHour(assumptions, fuel.fuelBurnGph) * fuel.charterFlightHours;
}

/**
 * Annual jet fuel tax differential credit after tax credit treatment.
 */
export function computeJetFuelTaxDifferentialCredit(
  assumptions: AssumptionMap,
  fuel: JetFuelTaxCreditInputs
): number {
  const treatment = assumptions.fet_treatment ?? "pass_through";
  if (treatment === "excluded") return 0;

  const credit = jetFuelTaxCreditAnnualBase(assumptions, fuel);
  if (credit <= 0) return 0;

  if (treatment === "pass_through") return credit;
  if (treatment === "absorbed") return -credit * 0.5;
  return credit;
}

/** $/charter flight hour for pro forma rate column (hourly refund, pre-treatment). */
export function jetFuelTaxCreditRatePerCharterFlightHour(
  assumptions: AssumptionMap,
  fuel: JetFuelTaxCreditInputs
): number {
  return jetFuelTaxCreditPerHour(assumptions, fuel.fuelBurnGph);
}

/** @deprecated Use computeJetFuelTaxDifferentialCredit */
export const computeFetRefund = computeJetFuelTaxDifferentialCredit;

/** @deprecated Use jetFuelTaxCreditRatePerCharterFlightHour */
export const fetRefundRatePerHour = jetFuelTaxCreditRatePerCharterFlightHour;

/** @deprecated Use JetFuelTaxCreditInputs */
export type FetRefundFuelInputs = JetFuelTaxCreditInputs;

export function computeRegistrationAnnual(assumptions: AssumptionMap): number {
  const value = num(assumptions.aircraft_value);
  const rate = num(assumptions.registration_tax_rate);
  if (value > 0 && rate > 0) return Math.round((value * rate) / 100);
  return num(assumptions.registration_annual);
}
