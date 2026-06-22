import type { AssumptionMap } from "@/lib/assumptions";
import {
  assumptionsToProFormaInputs,
  blendedFuelPrice,
  calculateProForma,
  fuelCostPerHour,
  variableCostPerHour,
} from "@/lib/proforma";
import {
  computeJetFuelTaxDifferentialCredit,
  computeRegistrationAnnual,
  jetFuelTaxCreditPerHour,
} from "@/lib/fet-refund";
import {
  computeUtilizationProfile,
  syncUtilizationHours,
} from "@/lib/proforma-utilization";
import { computeHangarCalculatedAnnual, resolveHangarAnnual } from "@/lib/hangar-assumptions";
import { formatCurrency } from "@/lib/utils";

function num(v: string | undefined, fallback = 0): number {
  const n = parseFloat(v ?? "");
  return Number.isFinite(n) ? n : fallback;
}

function count(v: string | undefined, fallback = 1): number {
  const n = Math.round(num(v, fallback));
  return n > 0 ? n : 0;
}

/** Fields auto-computed in the workspace (shown read-only). */
export function isCalculatedField(name: string, assumptions?: AssumptionMap): boolean {
  if (CALCULATED_ASSUMPTION_KEYS.has(name)) return true;
  return false;
}

export const CALCULATED_ASSUMPTION_KEYS = new Set([
  "blended_fuel_price",
  "fuel_cost_per_hour",
  "pic_crew_total",
  "sic_crew_total",
  "cabin_crew_total",
  "crew_total",
  "pic_training_total",
  "sic_training_total",
  "crew_training_total",
  "variable_cost_per_hour",
  "monthly_debt_service",
  "registration_annual",
  "fet_refund_amount",
  "jet_fuel_tax_credit_per_hour",
  "hangar_calculated_annual",
]);

/** Legacy keys kept in DB but not shown in the UI. */
export const HIDDEN_LEGACY_ASSUMPTION_KEYS = new Set([
  "aircraft_variant",
  "aircraft_category",
  "engine_model",
  "apu_model",
  "home_airport_icao",
  "proposed_home_base",
  "airport_fee_estimate",
  "deice_exposure",
  "base_notes",
  "cabin_attendant_required",
  "total_fixed_costs",
  "other_revenue_notes",
  "charter_availability_notes",
  "opportunity_type",
  "aircraft_purpose",
  "operating_model",
  "proforma_line_visibility",
  "crew_training",
  "contract_pilot_allowance",
  "crew_travel_per_diem",
  "payroll_burden_pct",
  "broker_commission_allowance",
  "empty_leg_allowance",
  "charter_demand_confidence",
  "pilot_charter_incentive",
  "charter_block_hours",
  "charter_flight_hours",
  "hangar_pricing_mode",
  "hangar_source",
  "hangar_monthly",
]);

/** Per-pilot training annual × headcount; falls back to legacy crew_training if unset. */
export function resolveCrewTrainingTotal(a: AssumptionMap): {
  pic: number;
  sic: number;
  total: number;
} {
  const picPerPilot = num(a.pic_training);
  const sicPerPilot = num(a.sic_training);
  const picHeads = count(a.pic_count, 1);
  const sicHeads = count(a.sic_count, 1);
  let pic = picPerPilot > 0 && picHeads > 0 ? Math.round(picPerPilot * picHeads) : 0;
  let sic = sicPerPilot > 0 && sicHeads > 0 ? Math.round(sicPerPilot * sicHeads) : 0;
  const legacy = num(a.crew_training);
  if (pic === 0 && sic === 0 && legacy > 0) {
    pic = Math.round(legacy / 2);
    sic = legacy - pic;
  }
  return { pic, sic, total: pic + sic };
}

export function computePicTrainingTotal(a: AssumptionMap): number {
  return resolveCrewTrainingTotal(a).pic;
}

export function computeSicTrainingTotal(a: AssumptionMap): number {
  return resolveCrewTrainingTotal(a).sic;
}

export function computeCrewTrainingTotalAmount(a: AssumptionMap): number {
  return resolveCrewTrainingTotal(a).total;
}

/** Human-readable multiplier breakdown for workspace training footers. */
export function formatTrainingCalculationHint(
  a: AssumptionMap,
  role: "pic" | "sic" | "total"
): string | undefined {
  const perPic = num(a.pic_training);
  const perSic = num(a.sic_training);
  const picHeads = count(a.pic_count, 1);
  const sicHeads = count(a.sic_count, 1);
  const { pic, sic } = resolveCrewTrainingTotal(a);

  if (role === "pic") {
    if (perPic <= 0 || picHeads <= 0) return undefined;
    return `${formatCurrency(perPic)} × ${picHeads} PIC = ${formatCurrency(pic)}`;
  }
  if (role === "sic") {
    if (perSic <= 0 || sicHeads <= 0) return undefined;
    return `${formatCurrency(perSic)} × ${sicHeads} SIC = ${formatCurrency(sic)}`;
  }

  const parts: string[] = [];
  if (pic > 0 && perPic > 0 && picHeads > 0) {
    parts.push(`${formatCurrency(perPic)} × ${picHeads} PIC`);
  }
  if (sic > 0 && perSic > 0 && sicHeads > 0) {
    parts.push(`${formatCurrency(perSic)} × ${sicHeads} SIC`);
  }
  if (parts.length === 0) return undefined;
  return parts.join(" + ");
}

export function computePicCrewTotal(a: AssumptionMap): number {
  const salary = num(a.pic_salary);
  const heads = count(a.pic_count, 1);
  const benefitsPct = num(a.benefits_pct, 16);
  if (salary <= 0 || heads <= 0) return 0;
  return Math.round(salary * heads * (1 + benefitsPct / 100));
}

export function computeSicCrewTotal(a: AssumptionMap): number {
  const salary = num(a.sic_salary);
  const heads = count(a.sic_count, 1);
  const benefitsPct = num(a.benefits_pct, 16);
  if (salary <= 0 || heads <= 0) return 0;
  return Math.round(salary * heads * (1 + benefitsPct / 100));
}

export function computeCabinCrewTotal(a: AssumptionMap): number {
  const annual = num(a.cabin_attendant_annual_cost);
  const heads = count(a.cabin_attendant_count, 0);
  const benefitsPct = num(a.benefits_pct, 16);
  if (annual <= 0) return 0;
  const base = heads > 0 ? annual * heads : annual;
  return Math.round(base * (1 + benefitsPct / 100));
}

export function computeCrewTotal(a: AssumptionMap): number {
  return (
    computePicCrewTotal(a) + computeSicCrewTotal(a) + computeCabinCrewTotal(a)
  );
}

export function computeMonthlyDebtService(a: AssumptionMap): number | null {
  if (a.financing_enabled !== "yes") return null;
  const loan = num(a.loan_amount);
  const down = num(a.down_payment);
  const principal = Math.max(0, loan - down);
  if (principal <= 0) return 0;

  const termMonths = Math.max(1, Math.round(num(a.term_months, 120)));
  const annualRate = num(a.interest_rate) / 100;
  const monthlyRate = annualRate / 12;

  if (monthlyRate <= 0) {
    return Math.round(principal / termMonths);
  }

  const factor = Math.pow(1 + monthlyRate, termMonths);
  const payment = (principal * monthlyRate * factor) / (factor - 1);
  return Math.round(payment);
}

/** Recompute derived assumption keys from current map. */
export function computeDerivedAssumptions(assumptions: AssumptionMap): Partial<AssumptionMap> {
  const derived: Partial<AssumptionMap> = {};

  const hangarAnnual = resolveHangarAnnual(assumptions);
  if (hangarAnnual > 0) {
    derived.hangar_monthly = String(Math.round(hangarAnnual / 12));
  }

  derived.hangar_calculated_annual = String(computeHangarCalculatedAnnual(assumptions));

  const homeFuel = num(assumptions.home_fuel_price);
  const awayFuel = num(assumptions.away_fuel_price);
  const homePct = num(assumptions.home_fuel_pct, 70);
  if (homeFuel > 0 || awayFuel > 0) {
    const blended = blendedFuelPrice(homeFuel, awayFuel, homePct);
    derived.blended_fuel_price = blended.toFixed(2);

    const burn = num(assumptions.fuel_burn_gph);
    if (burn > 0) {
      derived.fuel_cost_per_hour = fuelCostPerHour(burn, blended).toFixed(2);
    }
  }

  const fuelCostHr = num(derived.fuel_cost_per_hour ?? assumptions.fuel_cost_per_hour);
  const variable = variableCostPerHour({
    fuelCostPerHour: fuelCostHr,
    engineProgramRate: num(assumptions.engine_program_rate),
    apuProgramRate: num(assumptions.apu_program_rate),
    partsProgramRate: num(assumptions.parts_program_rate),
    inspectionReserveRate: num(assumptions.inspection_reserve_rate),
    maintenanceReserveRate: num(assumptions.maintenance_reserve_rate),
    tripExpensePerHour: num(assumptions.trip_expense_per_hour),
  });
  const airframe = num(assumptions.airframe_program_rate);
  const totalVariable = variable + airframe;
  if (totalVariable > 0) {
    derived.variable_cost_per_hour = totalVariable.toFixed(2);
  }

  const picTotal = computePicCrewTotal(assumptions);
  const sicTotal = computeSicCrewTotal(assumptions);
  const cabinTotal = computeCabinCrewTotal(assumptions);
  derived.pic_crew_total = String(picTotal);
  derived.sic_crew_total = String(sicTotal);
  derived.cabin_crew_total = String(cabinTotal);
  derived.crew_total = String(picTotal + sicTotal + cabinTotal);

  const training = resolveCrewTrainingTotal(assumptions);
  derived.pic_training_total = String(training.pic);
  derived.sic_training_total = String(training.sic);
  derived.crew_training_total = String(training.total);

  const debt = computeMonthlyDebtService(assumptions);
  if (debt != null) {
    derived.monthly_debt_service = String(debt);
  } else {
    derived.monthly_debt_service = "";
  }

  const registration = computeRegistrationAnnual(assumptions);
  if (registration > 0) {
    derived.registration_annual = String(registration);
  }

  const synced = syncUtilizationHours(assumptions);
  if (synced.charter_block_hours !== undefined) {
    derived.charter_block_hours = synced.charter_block_hours;
  }
  if (synced.charter_flight_hours !== undefined) {
    derived.charter_flight_hours = synced.charter_flight_hours;
  }

  const profile = computeUtilizationProfile(synced);
  const burnGph = num(assumptions.fuel_burn_gph);
  if (burnGph > 0) {
    const hourly = jetFuelTaxCreditPerHour(synced, burnGph);
    derived.jet_fuel_tax_credit_per_hour = hourly.toFixed(2);
    if (profile.availableCharterFlightHours > 0) {
      const credit = computeJetFuelTaxDifferentialCredit(synced, {
        charterFlightHours: profile.availableCharterFlightHours,
        fuelBurnGph: burnGph,
      });
      derived.fet_refund_amount = String(Math.round(credit));
    }
  }

  const out: Partial<AssumptionMap> = {};
  for (const [k, v] of Object.entries(derived)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

export function mergeWithDerived(assumptions: AssumptionMap): AssumptionMap {
  const merged = { ...assumptions, ...computeDerivedAssumptions(assumptions) };
  const out: AssumptionMap = {};
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}
