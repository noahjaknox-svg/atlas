/**
 * Pure pro forma calculation engine — all formulas from spec Section 5.
 */

import type { AssumptionMap } from "@/lib/assumptions";
import { computePilotCharterIncentiveAnnual } from "@/lib/pilot-charter-incentive";
import {
  computeUtilizationProfile,
  syncUtilizationHours,
} from "@/lib/proforma-utilization";

export interface ProFormaInputs {
  fuelBurnGph: number;
  homeFuelPrice: number;
  awayFuelPrice: number;
  homeFuelPct: number;
  engineProgramRate: number;
  apuProgramRate: number;
  partsProgramRate: number;
  inspectionReserveRate: number;
  maintenanceReserveRate: number;
  tripExpensePerHour: number;
  totalFixedCosts: number;
  charterRate: number;
  /** Charter Revenue Hours (block / revenue basis) */
  charterRevenueHours: number;
  /** Available Charter Flight Hours (charter variable cost basis) */
  availableCharterFlightHours: number;
  /** @deprecated Use charterRevenueHours */
  charterBlockHours: number;
  /** @deprecated Use availableCharterFlightHours */
  charterFlightHours: number;
  charterPaybackPct: number;
  fuelSurcharge: number;
  /** Charter flight hours basis for fuel surcharge (not block/revenue hours). */
  fuelSurchargeFlightHours?: number;
  ownerFlightHours: number;
  aircraftValue?: number;
  insurancePremiumPercent?: number;
  insuranceBasis?: "hull_value" | "fixed";
  fixedInsuranceAnnual?: number;
}

export interface ProFormaLineItem {
  key: string;
  label: string;
  category: "revenue" | "fixed" | "variable" | "subtotal" | "total" | "metric";
  annual: number;
  monthly: number;
}

export interface ProFormaResult {
  blendedFuelPrice: number;
  fuelCostPerHour: number;
  variableCostPerHour: number;
  charterRevenue: number;
  fuelSurchargeRevenue: number;
  totalRevenue: number;
  charterVariableCost: number;
  ownerVariableCost: number;
  netBeforeOwner: number;
  netAnnualCost: number;
  netMonthlyCost: number;
  costPerOwnerHour: number;
  insuranceEstimate: number;
  lineItems: ProFormaLineItem[];
}

export function blendedFuelPrice(
  homeFuelPrice: number,
  awayFuelPrice: number,
  homeFuelPct: number
): number {
  const homePct = homeFuelPct / 100;
  return homeFuelPrice * homePct + awayFuelPrice * (1 - homePct);
}

export function fuelCostPerHour(fuelBurnGph: number, blendedPrice: number): number {
  return fuelBurnGph * blendedPrice;
}

export function variableCostPerHour(params: {
  fuelCostPerHour: number;
  engineProgramRate: number;
  apuProgramRate: number;
  partsProgramRate: number;
  inspectionReserveRate: number;
  maintenanceReserveRate: number;
  tripExpensePerHour: number;
}): number {
  return (
    params.fuelCostPerHour +
    params.engineProgramRate +
    params.apuProgramRate +
    params.partsProgramRate +
    params.inspectionReserveRate +
    params.maintenanceReserveRate +
    params.tripExpensePerHour
  );
}

export function insuranceEstimate(
  aircraftValue: number,
  premiumPercent: number,
  basis: "hull_value" | "fixed",
  fixedAnnual: number
): number {
  if (basis === "hull_value") {
    return aircraftValue * (premiumPercent / 100);
  }
  return fixedAnnual;
}

export function calculateProForma(inputs: ProFormaInputs): ProFormaResult {
  const blended = blendedFuelPrice(
    inputs.homeFuelPrice,
    inputs.awayFuelPrice,
    inputs.homeFuelPct
  );
  const fuelPerHour = fuelCostPerHour(inputs.fuelBurnGph, blended);
  const varPerHour = variableCostPerHour({
    fuelCostPerHour: fuelPerHour,
    engineProgramRate: inputs.engineProgramRate,
    apuProgramRate: inputs.apuProgramRate,
    partsProgramRate: inputs.partsProgramRate,
    inspectionReserveRate: inputs.inspectionReserveRate,
    maintenanceReserveRate: inputs.maintenanceReserveRate,
    tripExpensePerHour: inputs.tripExpensePerHour,
  });

  const revenueHours = inputs.charterRevenueHours || inputs.charterBlockHours;
  const availableHours =
    inputs.availableCharterFlightHours || inputs.charterFlightHours;
  const fuelSurchargeHours =
    inputs.fuelSurchargeFlightHours ?? availableHours ?? revenueHours;

  const charterRevenue =
    inputs.charterRate * revenueHours * (inputs.charterPaybackPct / 100);
  const fuelSurchargeRevenue = inputs.fuelSurcharge * fuelSurchargeHours;
  const totalRevenue = charterRevenue + fuelSurchargeRevenue;

  const charterVariableCost = availableHours * varPerHour;
  const ownerVariableCost = inputs.ownerFlightHours * varPerHour;

  const insurance =
    inputs.insuranceBasis === "hull_value" && inputs.aircraftValue != null
      ? insuranceEstimate(
          inputs.aircraftValue,
          inputs.insurancePremiumPercent ?? 0,
          "hull_value",
          0
        )
      : (inputs.fixedInsuranceAnnual ?? 0);

  const netBeforeOwner =
    totalRevenue - inputs.totalFixedCosts - charterVariableCost;
  const netAnnualCost = netBeforeOwner - ownerVariableCost;
  const netMonthlyCost = netAnnualCost / 12;
  const costPerOwnerHour =
    inputs.ownerFlightHours > 0
      ? Math.abs(netAnnualCost) / inputs.ownerFlightHours
      : 0;

  const lineItems: ProFormaLineItem[] = [
    {
      key: "charter_revenue",
      label: "Charter Revenue",
      category: "revenue",
      annual: charterRevenue,
      monthly: charterRevenue / 12,
    },
    {
      key: "fuel_surcharge",
      label: "Fuel Surcharge",
      category: "revenue",
      annual: fuelSurchargeRevenue,
      monthly: fuelSurchargeRevenue / 12,
    },
    {
      key: "total_revenue",
      label: "Total Revenue",
      category: "subtotal",
      annual: totalRevenue,
      monthly: totalRevenue / 12,
    },
    {
      key: "fixed_costs",
      label: "Fixed Ownership Costs",
      category: "fixed",
      annual: inputs.totalFixedCosts,
      monthly: inputs.totalFixedCosts / 12,
    },
    {
      key: "charter_variable",
      label: "Charter Variable Costs",
      category: "variable",
      annual: charterVariableCost,
      monthly: charterVariableCost / 12,
    },
    {
      key: "owner_variable",
      label: "Owner Variable Costs",
      category: "variable",
      annual: ownerVariableCost,
      monthly: ownerVariableCost / 12,
    },
    {
      key: "net_operating",
      label: "Net Aircraft Operating Profit / (Loss) Before Owner Use",
      category: "subtotal",
      annual: netBeforeOwner,
      monthly: netBeforeOwner / 12,
    },
    {
      key: "net_annual",
      label: "Net Annual Owner Cost",
      category: "total",
      annual: netAnnualCost,
      monthly: netMonthlyCost,
    },
    {
      key: "net_monthly",
      label: "Net Monthly Owner Cost",
      category: "total",
      annual: netAnnualCost,
      monthly: netMonthlyCost,
    },
    {
      key: "cost_per_hour",
      label: "Cost Per Owner Hour",
      category: "metric",
      annual: costPerOwnerHour,
      monthly: costPerOwnerHour,
    },
  ];

  return {
    blendedFuelPrice: blended,
    fuelCostPerHour: fuelPerHour,
    variableCostPerHour: varPerHour,
    charterRevenue,
    fuelSurchargeRevenue,
    totalRevenue,
    charterVariableCost,
    ownerVariableCost,
    netBeforeOwner,
    netAnnualCost,
    netMonthlyCost,
    costPerOwnerHour,
    insuranceEstimate: insurance,
    lineItems,
  };
}

/** Build ProFormaInputs from a flat assumptions map (wizard / snapshot). */
export function assumptionsToProFormaInputs(
  assumptions: Record<string, string | number>
): ProFormaInputs {
  const get = (key: string, fallback = 0) => {
    const v = assumptions[key];
    if (v == null || v === "") return fallback;
    return typeof v === "number" ? v : parseFloat(String(v)) || fallback;
  };

  const synced = syncUtilizationHours(assumptions as AssumptionMap);
  const utilization = computeUtilizationProfile(synced);

  return {
    fuelBurnGph: get("fuel_burn_gph"),
    homeFuelPrice: get("home_fuel_price"),
    awayFuelPrice: get("away_fuel_price"),
    homeFuelPct: get("home_fuel_pct", 70),
    engineProgramRate: get("engine_program_rate"),
    apuProgramRate: get("apu_program_rate"),
    partsProgramRate: get("parts_program_rate"),
    inspectionReserveRate: get("inspection_reserve_rate"),
    maintenanceReserveRate: get("maintenance_reserve_rate"),
    tripExpensePerHour: get("trip_expense_per_hour"),
    totalFixedCosts: get("total_fixed_costs"),
    charterRate: get("charter_rate"),
    charterRevenueHours: utilization.charterRevenueHours,
    availableCharterFlightHours: utilization.availableCharterFlightHours,
    charterBlockHours: utilization.charterRevenueHours,
    charterFlightHours: utilization.availableCharterFlightHours,
    charterPaybackPct: (() => {
      const p = get("charter_payback_pct");
      return p > 0 ? p : 75;
    })(),
    fuelSurcharge: get("fuel_surcharge"),
    fuelSurchargeFlightHours: utilization.availableCharterFlightHours,
    ownerFlightHours: utilization.ownerHours,
    aircraftValue: get("aircraft_value"),
    insurancePremiumPercent: get("insurance_premium_percent"),
    insuranceBasis:
      assumptions.insurance_mode === "percent_hull" ||
      (assumptions.insurance_basis as string) === "hull_value"
        ? "hull_value"
        : "fixed",
    fixedInsuranceAnnual: get("insurance_annual"),
  };
}

/** Sum fixed ownership line items from assumptions (P&L-aligned). */
function resolveCrewTrainingTotalFromAssumptions(
  assumptions: AssumptionMap
): { total: number } {
  const get = (key: string, fallback = 0) => {
    const v = assumptions[key];
    if (v == null || v === "") return fallback;
    return typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, "")) || fallback;
  };
  const picPer = get("pic_training");
  const sicPer = get("sic_training");
  const picHeads = Math.max(0, Math.round(get("pic_count", 1)));
  const sicHeads = Math.max(0, Math.round(get("sic_count", 1)));
  let pic = picPer > 0 && picHeads > 0 ? Math.round(picPer * picHeads) : 0;
  let sic = sicPer > 0 && sicHeads > 0 ? Math.round(sicPer * sicHeads) : 0;
  const legacy = get("crew_training");
  if (pic === 0 && sic === 0 && legacy > 0) {
    pic = Math.round(legacy / 2);
    sic = legacy - pic;
  }
  return { total: pic + sic };
}

export function computeTotalFixedFromAssumptions(
  assumptions: Record<string, string | number>
): number {
  const get = (key: string) => {
    const v = assumptions[key];
    if (v == null || v === "") return 0;
    return typeof v === "number" ? v : parseFloat(String(v)) || 0;
  };
  const mode = String(assumptions.insurance_mode ?? "annual");
  let insurance = get("insurance_annual");
  if (mode === "percent_hull") {
    const val = get("aircraft_value");
    insurance = val * (get("insurance_premium_percent") / 100);
  }
  const picTraining = resolveCrewTrainingTotalFromAssumptions(assumptions as AssumptionMap);

  const synced = syncUtilizationHours(assumptions as AssumptionMap);
  const availableHours = computeUtilizationProfile(synced).availableCharterFlightHours;
  const pilotIncentive = computePilotCharterIncentiveAnnual(synced, availableHours);

  return (
    get("crew_total") +
    picTraining.total +
    pilotIncentive +
    get("management_fee") +
    (get("maintenance_management_fee") || get("maintenance_mgmt_fee")) +
    (get("hangar_annual") || get("hangar_monthly") * 12) +
    get("registration_annual") +
    insurance +
    (get("wifi_annual") || get("wifi_subscription")) +
    get("subscriptions_annual") +
    get("cleaning_annual") +
    get("supplies_annual") +
    get("airport_fees_annual")
  );
}

export interface ScenarioInput {
  scenarioIndex: number;
  charterBlockHours: number;
  charterFlightHours: number;
  ownerFlightHours: number;
}

export const DEFAULT_SCENARIO_INPUTS: ScenarioInput[] = [
  { scenarioIndex: 0, charterBlockHours: 350, charterFlightHours: 395.5, ownerFlightHours: 100 },
  { scenarioIndex: 1, charterBlockHours: 325, charterFlightHours: 367.25, ownerFlightHours: 125 },
  { scenarioIndex: 2, charterBlockHours: 300, charterFlightHours: 339, ownerFlightHours: 150 },
];

export function breakEvenCharterHours(inputs: ProFormaInputs): number | null {
  const rate = inputs.charterRate * (inputs.charterPaybackPct / 100);
  const blended = blendedFuelPrice(
    inputs.homeFuelPrice,
    inputs.awayFuelPrice,
    inputs.homeFuelPct
  );
  const varHr = variableCostPerHour({
    fuelCostPerHour: fuelCostPerHour(inputs.fuelBurnGph, blended),
    engineProgramRate: inputs.engineProgramRate,
    apuProgramRate: inputs.apuProgramRate,
    partsProgramRate: inputs.partsProgramRate,
    inspectionReserveRate: inputs.inspectionReserveRate,
    maintenanceReserveRate: inputs.maintenanceReserveRate,
    tripExpensePerHour: inputs.tripExpensePerHour,
  });
  const denom = rate - varHr;
  if (denom <= 0) return null;
  return Math.ceil(inputs.totalFixedCosts / denom);
}

export type ScenarioProFormaResult = ProFormaResult & {
  scenarioIndex: number;
  charterBlockHours: number;
  charterFlightHours: number;
  ownerFlightHours: number;
  breakEvenCharterHours: number | null;
};

export function calculateProFormaScenarios(
  baseInputs: ProFormaInputs,
  scenarios: ScenarioInput[]
): ScenarioProFormaResult[] {
  return scenarios.map((s) => {
    const inputs: ProFormaInputs = {
      ...baseInputs,
      charterBlockHours: s.charterBlockHours,
      charterFlightHours: s.charterFlightHours,
      ownerFlightHours: s.ownerFlightHours,
    };
    return {
      scenarioIndex: s.scenarioIndex,
      charterBlockHours: s.charterBlockHours,
      charterFlightHours: s.charterFlightHours,
      ownerFlightHours: s.ownerFlightHours,
      breakEvenCharterHours: breakEvenCharterHours(inputs),
      ...calculateProForma(inputs),
    };
  });
}
