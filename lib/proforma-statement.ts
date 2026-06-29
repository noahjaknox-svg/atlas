import type { AssumptionMap } from "@/lib/assumptions";
import {
  assumptionsToProFormaInputs,
  blendedFuelPrice,
  calculateProForma,
  fuelCostPerHour,
  insuranceEstimate,
  variableCostPerHour,
  type ProFormaInputs,
} from "@/lib/proforma";
import {
  computeCrewTotal,
  computeMonthlyDebtService,
  resolveCrewTrainingTotal,
} from "@/lib/aircraft-calculated-fields";
import { resolveFinancingAmounts } from "@/lib/financing-assumptions";
import { resolveHangarAnnual } from "@/lib/hangar-assumptions";
import {
  computeUtilizationProfile,
  syncUtilizationHours,
  type UtilizationProfile,
} from "@/lib/proforma-utilization";
import { isCharterUsageEnabled } from "@/lib/usage-type";
import {
  computeJetFuelTaxDifferentialCredit,
  computeRegistrationAnnual,
  FET_FUEL_TAX_REFUND_LABEL,
  FET_FUEL_TAX_REFUND_RATE_LABEL,
  jetFuelTaxCreditRatePerCharterFlightHour,
  resolveJetFuelTaxDifferentialPerGal,
} from "@/lib/fet-refund";
import { computePilotCharterIncentiveAnnual } from "@/lib/pilot-charter-incentive";
import {
  parseProformaCustomFixedCosts,
  customFixedCostLineKey,
  sumProformaCustomFixedCosts,
} from "@/lib/proforma-custom-fixed-costs";
import { formatCurrency } from "@/lib/utils";

function num(v: string | undefined, fallback = 0): number {
  const n = parseFloat(v ?? "");
  return Number.isFinite(n) ? n : fallback;
}

export type ProFormaColumnLayout =
  | "utilization"
  | "revenue"
  | "fixed"
  | "hourly_variable"
  | "bridge"
  | "owner_summary";

export type ProFormaRowKind =
  | "section"
  | "line"
  | "subtotal"
  | "total"
  | "metric"
  | "info";

export type ProFormaRowSign = "revenue" | "expense" | "neutral";

export type ProFormaStatementRow = {
  key: string;
  label: string;
  kind: ProFormaRowKind;
  layout: ProFormaColumnLayout;
  sign?: ProFormaRowSign;
  rate?: number | null;
  hours?: number | null;
  annual: number | null;
  monthly: number | null;
  hidden?: boolean;
  toggleable?: boolean;
};

export type ProFormaAssumptionUsedItem = { label: string; value: string };

export type ProFormaStatement = {
  rows: ProFormaStatementRow[];
  assumptionsUsed: ProFormaAssumptionUsedItem[];
  utilization: UtilizationProfile;
};

function fixedLineAnnualMagnitude(row: ProFormaStatementRow): number {
  return Math.abs(row.annual ?? 0);
}

/** Sort fixed ownership line items descending by annual amount (absolute value). */
export function sortFixedOwnershipStatementRows(
  rows: ProFormaStatementRow[]
): ProFormaStatementRow[] {
  const out: ProFormaStatementRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.kind !== "section" || row.layout !== "fixed") {
      out.push(row);
      continue;
    }

    out.push(row);
    const lines: ProFormaStatementRow[] = [];
    const trailing: ProFormaStatementRow[] = [];
    i++;
    while (i < rows.length && rows[i].kind !== "section") {
      const sectionRow = rows[i];
      if (sectionRow.kind === "line" && sectionRow.layout === "fixed") {
        lines.push(sectionRow);
      } else {
        trailing.push(sectionRow);
      }
      i++;
    }
    lines.sort((a, b) => fixedLineAnnualMagnitude(b) - fixedLineAnnualMagnitude(a));
    out.push(...lines, ...trailing);
    i--;
  }
  return out;
}

function expenseAnnual(amount: number): number {
  return -Math.abs(amount);
}

function section(title: string, layout: ProFormaColumnLayout): ProFormaStatementRow {
  return {
    key: `section_${layout}_${title}`,
    label: title,
    kind: "section",
    layout,
    annual: null,
    monthly: null,
  };
}

function revenueLine(
  key: string,
  label: string,
  rate: number,
  hours: number,
  annual: number
): ProFormaStatementRow {
  return {
    key,
    label,
    kind: "line",
    layout: "revenue",
    sign: "revenue",
    rate,
    hours,
    annual,
    monthly: annual / 12,
    toggleable: true,
  };
}

function fixedLine(key: string, label: string, annual: number): ProFormaStatementRow {
  return {
    key,
    label,
    kind: "line",
    layout: "fixed",
    sign: "expense",
    annual: expenseAnnual(annual),
    monthly: expenseAnnual(annual) / 12,
    toggleable: true,
  };
}

function hourlyVarLine(
  key: string,
  label: string,
  ratePerHour: number,
  hours: number,
  layout: "hourly_variable"
): ProFormaStatementRow {
  const annual = ratePerHour * hours;
  return {
    key,
    label,
    kind: "line",
    layout,
    sign: "expense",
    rate: ratePerHour,
    hours,
    annual: expenseAnnual(annual),
    monthly: expenseAnnual(annual) / 12,
    toggleable: true,
  };
}

function subtotalRow(
  key: string,
  label: string,
  layout: ProFormaColumnLayout,
  annual: number,
  opts?: { rate?: number; hours?: number }
): ProFormaStatementRow {
  return {
    key,
    label,
    kind: "subtotal",
    layout,
    sign: annual >= 0 ? "revenue" : "expense",
    rate: opts?.rate ?? null,
    hours: opts?.hours ?? null,
    annual,
    monthly: annual / 12,
  };
}

function bridgeRow(key: string, label: string, annual: number): ProFormaStatementRow {
  return {
    key,
    label,
    kind: "subtotal",
    layout: "bridge",
    sign: annual >= 0 ? "revenue" : "expense",
    annual,
    monthly: annual / 12,
  };
}

function ownerSummaryRow(
  key: string,
  label: string,
  annual: number,
  kind: "subtotal" | "total" | "metric" = "subtotal"
): ProFormaStatementRow {
  return {
    key,
    label,
    kind,
    layout: "owner_summary",
    sign: kind === "metric" ? "neutral" : annual >= 0 ? "revenue" : "expense",
    annual: kind === "metric" ? annual : annual,
    monthly: kind === "metric" ? annual : annual / 12,
  };
}

function resolveInsuranceAnnual(a: AssumptionMap): number {
  const mode = a.insurance_mode === "percent_hull" ? "percent_hull" : "annual";
  const value = num(a.aircraft_value);
  if (mode === "percent_hull" && value > 0) {
    return insuranceEstimate(value, num(a.insurance_premium_percent), "hull_value", 0);
  }
  const flat = num(a.insurance_annual);
  if (flat > 0) return flat;
  if (value > 0 && num(a.insurance_premium_percent) > 0) {
    return insuranceEstimate(value, num(a.insurance_premium_percent), "hull_value", 0);
  }
  return flat;
}

function sumFixedOwnership(a: AssumptionMap, availableCharterFlightHours: number) {
  const crew = num(a.crew_total) || computeCrewTotal(a);
  const training = resolveCrewTrainingTotal(a);
  const management = num(a.management_fee);
  const maintMgmt =
    num(a.maintenance_management_fee) || num(a.maintenance_mgmt_fee as string);
  const hangar = resolveHangarAnnual(a);
  const registration = computeRegistrationAnnual(a);
  const insurance = resolveInsuranceAnnual(a);
  const wifi = num(a.wifi_annual) || num(a.wifi_subscription as string);
  const subscriptions = num(a.subscriptions_annual);
  const cleaning = num(a.cleaning_annual);
  const supplies = num(a.supplies_annual);
  const airport = num(a.airport_fees_annual);
  const pilotCharterIncentive = computePilotCharterIncentiveAnnual(
    a,
    availableCharterFlightHours
  );
  const monthlyDebt =
    a.financing_enabled === "yes" ? computeMonthlyDebtService(a) ?? 0 : 0;
  const debtService = monthlyDebt > 0 ? monthlyDebt * 12 : 0;
  const customItems = parseProformaCustomFixedCosts(a);
  const customTotal = sumProformaCustomFixedCosts(customItems);
  const total =
    crew +
    training.total +
    management +
    maintMgmt +
    hangar +
    registration +
    insurance +
    wifi +
    subscriptions +
    cleaning +
    supplies +
    airport +
    pilotCharterIncentive +
    debtService +
    customTotal;
  return {
    crew,
    training,
    management,
    maintMgmt,
    hangar,
    registration,
    insurance,
    wifi,
    subscriptions,
    cleaning,
    supplies,
    airport,
    pilotCharterIncentive,
    debtService,
    customItems,
    customTotal,
    total,
  };
}

type VariableBreakdown = {
  fuel: number;
  parts: number;
  engine: number;
  apu: number;
  airframe: number;
  inspection: number;
  maintenance: number;
  trip: number;
  total: number;
  rates: {
    fuel: number;
    parts: number;
    engine: number;
    apu: number;
    airframe: number;
    inspection: number;
    maintenance: number;
    trip: number;
  };
};

function variableBreakdown(
  hours: number,
  fuelPerHour: number,
  a: AssumptionMap,
  includeTrip = true
): VariableBreakdown {
  const rates = {
    fuel: fuelPerHour,
    parts: num(a.parts_program_rate),
    engine: num(a.engine_program_rate),
    apu: num(a.apu_program_rate),
    airframe: num(a.airframe_program_rate),
    inspection: num(a.inspection_reserve_rate),
    maintenance: num(a.maintenance_reserve_rate),
    trip: includeTrip ? num(a.trip_expense_per_hour) : 0,
  };
  const fuel = rates.fuel * hours;
  const parts = rates.parts * hours;
  const engine = rates.engine * hours;
  const apu = rates.apu * hours;
  const airframe = rates.airframe * hours;
  const inspection = rates.inspection * hours;
  const maintenance = rates.maintenance * hours;
  const trip = rates.trip * hours;
  const total = fuel + parts + engine + apu + airframe + inspection + maintenance + trip;
  return { fuel, parts, engine, apu, airframe, inspection, maintenance, trip, total, rates };
}

function buildAssumptionsUsedPanel(
  a: AssumptionMap,
  blended: number,
  fuelHr: number,
  varHr: number,
  paybackPct: number
): ProFormaAssumptionUsedItem[] {
  return [
    { label: "Home fuel price ($/gal)", value: num(a.home_fuel_price).toFixed(2) },
    { label: "Away fuel price ($/gal)", value: num(a.away_fuel_price).toFixed(2) },
    { label: "% fuel at home", value: `${num(a.home_fuel_pct, 70)}%` },
    { label: "Fuel burn (GPH)", value: String(num(a.fuel_burn_gph) || "—") },
    { label: "Blended fuel price ($/gal)", value: blended.toFixed(2) },
    { label: "Fuel cost per flight hour", value: formatRate(fuelHr) },
    { label: "Variable cost per flight hour", value: formatRate(varHr) },
    { label: "Charter payback %", value: `${paybackPct}%` },
    {
      label: FET_FUEL_TAX_REFUND_RATE_LABEL,
      value: `$${resolveJetFuelTaxDifferentialPerGal(a).toFixed(3)}`,
    },
    { label: "Fuel source", value: a.fuel_source?.trim() || "—" },
    ...(a.financing_enabled === "yes"
      ? (() => {
          const { downPayment, loanAmount } = resolveFinancingAmounts(a);
          const monthlyDebt = computeMonthlyDebtService(a) ?? 0;
          return [
            {
              label: "Down payment",
              value: downPayment > 0 ? formatCurrency(downPayment) : "—",
            },
            {
              label: "Loan amount",
              value: loanAmount > 0 ? formatCurrency(loanAmount) : "—",
            },
            {
              label: "Monthly debt service",
              value: monthlyDebt > 0 ? formatCurrency(monthlyDebt) : "—",
            },
          ];
        })()
      : []),
  ];
}

function formatRate(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}/hr`;
}

function computeCharterRevenueAmounts(
  synced: AssumptionMap,
  revenueHours: number,
  fuelSurchargeHours: number
): {
  charterRate: number;
  paybackPct: number;
  effectiveRate: number;
  charterRevenue: number;
  fuelSurchargeRevenue: number;
} {
  const charterRate = num(synced.charter_rate);
  const paybackRaw = num(synced.charter_payback_pct);
  const paybackPct = paybackRaw > 0 ? paybackRaw : 75;
  const effectiveRate = charterRate * (paybackPct / 100);
  const charterRevenue =
    charterRate > 0 && revenueHours > 0
      ? charterRate * revenueHours * (paybackPct / 100)
      : 0;
  const fuelSurchargeRevenue = num(synced.fuel_surcharge) * fuelSurchargeHours;
  return {
    charterRate,
    paybackPct,
    effectiveRate,
    charterRevenue,
    fuelSurchargeRevenue,
  };
}

/** Build industry-format operating statement for workspace Pro Forma. */
export function buildProFormaStatement(assumptions: AssumptionMap): ProFormaStatement {
  const synced = syncUtilizationHours(assumptions);
  const u = computeUtilizationProfile(synced);
  const charterEnabled = isCharterUsageEnabled(synced);

  const revenueCalc = computeCharterRevenueAmounts(
    synced,
    u.charterRevenueHours,
    u.availableCharterFlightHours
  );

  const inputs: ProFormaInputs = {
    ...assumptionsToProFormaInputs(synced),
    charterRevenueHours: u.charterRevenueHours,
    availableCharterFlightHours: u.availableCharterFlightHours,
    ownerFlightHours: u.ownerFlightHours,
    charterBlockHours: u.charterRevenueHours,
    charterFlightHours: u.availableCharterFlightHours,
    charterRate: revenueCalc.charterRate,
    charterPaybackPct: revenueCalc.paybackPct,
    totalFixedCosts: 0,
    insuranceBasis:
      assumptions.insurance_mode === "percent_hull" ? "hull_value" : "fixed",
    fixedInsuranceAnnual: resolveInsuranceAnnual(assumptions),
    insurancePremiumPercent: num(assumptions.insurance_premium_percent),
    aircraftValue: num(assumptions.aircraft_value),
  };

  const fixed = sumFixedOwnership(synced, u.availableCharterFlightHours);
  inputs.totalFixedCosts = fixed.total;

  const result = calculateProForma(inputs);
  const blended = blendedFuelPrice(
    inputs.homeFuelPrice,
    inputs.awayFuelPrice,
    inputs.homeFuelPct
  );
  const fuelHr = fuelCostPerHour(inputs.fuelBurnGph, blended);
  const varHr =
    num(synced.variable_cost_per_hour) ||
    variableCostPerHour({
      fuelCostPerHour: fuelHr,
      engineProgramRate: inputs.engineProgramRate,
      apuProgramRate: inputs.apuProgramRate,
      partsProgramRate: inputs.partsProgramRate,
      inspectionReserveRate: inputs.inspectionReserveRate,
      maintenanceReserveRate: inputs.maintenanceReserveRate,
      tripExpensePerHour: inputs.tripExpensePerHour,
    }) + num(synced.airframe_program_rate);

  const charterVar = variableBreakdown(
    u.availableCharterFlightHours,
    fuelHr,
    synced,
    false
  );
  const ownerVar = variableBreakdown(u.ownerFlightHours, fuelHr, synced, true);

  const charterRevenue = revenueCalc.charterRevenue;
  const fuelSurchargeRevenue = revenueCalc.fuelSurchargeRevenue;
  const revenueHours = u.charterRevenueHours;
  const charterFlightHours = u.availableCharterFlightHours;
  const jetFuelTaxCreditInputs = {
    charterFlightHours,
    fuelBurnGph: inputs.fuelBurnGph,
  };
  const jetFuelTaxCredit = charterEnabled
    ? computeJetFuelTaxDifferentialCredit(synced, jetFuelTaxCreditInputs)
    : 0;
  const totalRevenue = charterEnabled
    ? charterRevenue + fuelSurchargeRevenue + jetFuelTaxCredit
    : 0;

  const netBeforeOwner = charterEnabled
    ? totalRevenue - fixed.total - charterVar.total
    : -fixed.total - ownerVar.total;

  const netAnnualOwner = netBeforeOwner - ownerVar.total;

  const rows: ProFormaStatementRow[] = [];

  if (charterEnabled) {
    rows.push(
      section("Revenue", "revenue"),
      revenueLine(
        "charter_revenue_block",
        "Charter Revenue",
        revenueCalc.effectiveRate,
        revenueHours,
        charterRevenue
      ),
      revenueLine(
        "fuel_surcharge",
        "Fuel Surcharge",
        num(synced.fuel_surcharge),
        charterFlightHours,
        fuelSurchargeRevenue
      ),
      revenueLine(
        "fet_refund",
        FET_FUEL_TAX_REFUND_LABEL,
        jetFuelTaxCreditRatePerCharterFlightHour(synced, jetFuelTaxCreditInputs),
        charterFlightHours,
        jetFuelTaxCredit
      ),
      subtotalRow("total_revenue", "Total Revenue", "revenue", totalRevenue, {
        hours: revenueHours,
      })
    );
  }

  rows.push(
    section("Fixed Ownership Costs", "fixed"),
    fixedLine("crew_salaries", "Crew Salaries & Benefits", fixed.crew),
    fixedLine("crew_training_pl", "Crew Training", fixed.training.total),
    ...(charterEnabled && fixed.pilotCharterIncentive > 0
      ? [
          fixedLine(
            "pilot_charter_incentive_pl",
            "Pilot Charter Incentive",
            fixed.pilotCharterIncentive
          ),
        ]
      : []),
    fixedLine("management_fee_pl", "Management Fee", fixed.management),
    fixedLine("maint_mgmt_fee_pl", "Maintenance Management Fee", fixed.maintMgmt),
    fixedLine("hangar_pl", "Hangar", fixed.hangar),
    fixedLine("registration_pl", "Registration / Taxes", fixed.registration),
    fixedLine("insurance_pl", "Insurance (Hull & Liability)", fixed.insurance),
    fixedLine("wifi_pl", "In-Flight Wi-Fi", fixed.wifi),
    fixedLine("subscriptions_pl", "Subscriptions", fixed.subscriptions),
    fixedLine("cleaning_pl", "Cleaning", fixed.cleaning),
    fixedLine("supplies_pl", "Supplies", fixed.supplies),
    fixedLine("airport_fees_pl", "Airport Fees", fixed.airport),
    ...(fixed.debtService > 0
      ? [fixedLine("financing_debt_pl", "Debt service", fixed.debtService)]
      : []),
    ...fixed.customItems.map((item) =>
      fixedLine(customFixedCostLineKey(item.id), item.name, item.amount)
    ),
    subtotalRow(
      "total_fixed_ownership",
      "Total Fixed Ownership Costs",
      "fixed",
      expenseAnnual(fixed.total)
    )
  );

  if (charterEnabled) {
    const ch = u.availableCharterFlightHours;
    rows.push(
      section("Charter Variable Costs", "hourly_variable"),
      hourlyVarLine("charter_fuel", "Fuel", charterVar.rates.fuel, ch, "hourly_variable"),
      hourlyVarLine("charter_parts", "Parts Programs", charterVar.rates.parts, ch, "hourly_variable"),
      hourlyVarLine(
        "charter_engine",
        "Engine Programs",
        charterVar.rates.engine,
        ch,
        "hourly_variable"
      ),
      hourlyVarLine("charter_apu", "APU Programs", charterVar.rates.apu, ch, "hourly_variable"),
      hourlyVarLine(
        "charter_airframe",
        "Airframe Programs",
        charterVar.rates.airframe,
        ch,
        "hourly_variable"
      ),
      hourlyVarLine(
        "charter_inspection",
        "Inspection Reserve",
        charterVar.rates.inspection,
        ch,
        "hourly_variable"
      ),
      hourlyVarLine(
        "charter_maintenance",
        "Maintenance Reserve",
        charterVar.rates.maintenance,
        ch,
        "hourly_variable"
      ),
      subtotalRow(
        "total_charter_variable",
        "Total Charter Variable Costs",
        "hourly_variable",
        expenseAnnual(charterVar.total),
        { hours: ch }
      )
    );

    rows.push(
      section("Net Before Owner Use", "bridge"),
      bridgeRow("bridge_total_revenue", "Total Revenue", totalRevenue),
      bridgeRow("bridge_fixed", "Less Fixed Ownership Costs", expenseAnnual(fixed.total)),
      bridgeRow(
        "bridge_charter_var",
        "Less Charter Variable Costs",
        expenseAnnual(charterVar.total)
      ),
      bridgeRow(
        "net_operating_pl",
        "Net Aircraft Operating Profit / (Loss) Before Owner Use",
        netBeforeOwner
      )
    );
  }

  const oh = u.ownerFlightHours;
  rows.push(
    section("Owner Variable Costs", "hourly_variable"),
    hourlyVarLine("owner_fuel", "Fuel", ownerVar.rates.fuel, oh, "hourly_variable"),
    hourlyVarLine("owner_parts", "Parts Programs", ownerVar.rates.parts, oh, "hourly_variable"),
    hourlyVarLine("owner_engine", "Engine Programs", ownerVar.rates.engine, oh, "hourly_variable"),
    hourlyVarLine("owner_apu", "APU Programs", ownerVar.rates.apu, oh, "hourly_variable"),
    hourlyVarLine(
      "owner_airframe",
      "Airframe Programs",
      ownerVar.rates.airframe,
      oh,
      "hourly_variable"
    ),
    hourlyVarLine(
      "owner_inspection",
      "Inspection Reserve",
      ownerVar.rates.inspection,
      oh,
      "hourly_variable"
    ),
    hourlyVarLine(
      "owner_maintenance",
      "Maintenance Reserve",
      ownerVar.rates.maintenance,
      oh,
      "hourly_variable"
    ),
    hourlyVarLine(
      "owner_trip",
      "Owner Trip Expense",
      ownerVar.rates.trip,
      oh,
      "hourly_variable"
    ),
    subtotalRow(
      "total_owner_variable",
      "Total Owner Variable Costs",
      "hourly_variable",
      expenseAnnual(ownerVar.total),
      { hours: oh }
    )
  );

  rows.push(
    section("Owner Cost Summary", "owner_summary"),
    ownerSummaryRow("bridge_net_before_owner", "Net Before Owner Use", netBeforeOwner),
    ownerSummaryRow(
      "bridge_owner_var",
      "Less Owner Variable Costs",
      expenseAnnual(ownerVar.total)
    ),
    ownerSummaryRow("net_annual_owner", "Net Annual Owner Cost", netAnnualOwner, "total"),
    ownerSummaryRow(
      "net_monthly_owner",
      "Net Monthly Owner Cost",
      netAnnualOwner / 12,
      "total"
    ),
    {
      key: "cost_per_owner_hour",
      label: "Owner Flight Cost per Flight Hour",
      kind: "metric",
      layout: "owner_summary",
      sign: "neutral",
      annual: result.costPerOwnerHour,
      monthly: result.costPerOwnerHour,
      hours: u.ownerFlightHours > 0 ? u.ownerFlightHours : null,
    }
  );

  const assumptionsUsed = buildAssumptionsUsedPanel(
    synced,
    blended,
    fuelHr,
    varHr,
    inputs.charterPaybackPct
  );

  return { rows: sortFixedOwnershipStatementRows(rows), assumptionsUsed, utilization: u };
}
