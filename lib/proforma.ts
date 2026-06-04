/**
 * Pure pro forma calculation engine — all formulas from spec Section 5.
 */

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
  charterBlockHours: number;
  charterFlightHours: number;
  charterPaybackPct: number;
  fuelSurcharge: number;
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

  const charterRevenue =
    inputs.charterRate * inputs.charterBlockHours * (inputs.charterPaybackPct / 100);
  const fuelSurchargeRevenue = inputs.fuelSurcharge * inputs.charterBlockHours;
  const totalRevenue = charterRevenue + fuelSurchargeRevenue;

  const charterVariableCost = inputs.charterFlightHours * varPerHour;
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
      label: "Charter Flight Costs",
      category: "variable",
      annual: charterVariableCost,
      monthly: charterVariableCost / 12,
    },
    {
      key: "owner_variable",
      label: "Owner Flight Costs",
      category: "variable",
      annual: ownerVariableCost,
      monthly: ownerVariableCost / 12,
    },
    {
      key: "net_operating",
      label: "Net Aircraft Operating Profit/Loss",
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
    charterBlockHours: get("charter_block_hours"),
    charterFlightHours: get("charter_flight_hours"),
    charterPaybackPct: get("charter_payback_pct", 85),
    fuelSurcharge: get("fuel_surcharge"),
    ownerFlightHours: get("owner_annual_hours"),
    aircraftValue: get("aircraft_value"),
    insurancePremiumPercent: get("insurance_premium_percent"),
    insuranceBasis: (assumptions.insurance_basis as "hull_value" | "fixed") ?? "hull_value",
    fixedInsuranceAnnual: get("insurance_annual"),
  };
}
