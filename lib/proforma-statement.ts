import type { AssumptionMap } from "@/lib/assumptions";
import {
  DEFAULT_LINE_CATALOG,
  lineItemValue,
  lineRowKey,
  resolveLineCatalog,
  type CatalogLineItem,
  type SystemCalcId,
} from "@/lib/line-item-catalog";
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

/** Built-in labels can be renamed in the catalog; default to the statement's own label. */
function labelFor(item: CatalogLineItem): string {
  return item.label?.trim() || defaultLabel(item);
}

function defaultLabel(item: CatalogLineItem): string {
  return DEFAULT_LINE_CATALOG.find((d) => d.key === item.key)?.label ?? item.label;
}

function withLabel(row: ProFormaStatementRow, item: CatalogLineItem, fallback: string): ProFormaStatementRow {
  const label = item.label?.trim() || fallback;
  return label === row.label ? row : { ...row, label };
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

type FixedLineAmount = { item: CatalogLineItem; amount: number };

/** Annual amount of a catalog fixed line (system calculators or the aircraft's value). */
function fixedLineAmount(
  item: CatalogLineItem,
  a: AssumptionMap,
  availableCharterFlightHours: number
): number {
  if (item.source === "aircraft_type") return lineItemValue(item, a);
  switch (item.systemCalc) {
    case "crew":
      return num(a.crew_total) || computeCrewTotal(a);
    case "crew_training":
      return resolveCrewTrainingTotal(a).total;
    case "pilot_charter_incentive":
      return computePilotCharterIncentiveAnnual(a, availableCharterFlightHours);
    case "management_fee":
      return num(a.management_fee);
    case "maintenance_management_fee":
      return num(a.maintenance_management_fee) || num(a.maintenance_mgmt_fee as string);
    case "hangar":
      return resolveHangarAnnual(a);
    case "registration":
      return computeRegistrationAnnual(a);
    case "insurance":
      return resolveInsuranceAnnual(a);
    case "debt_service": {
      const monthlyDebt = a.financing_enabled === "yes" ? computeMonthlyDebtService(a) ?? 0 : 0;
      return monthlyDebt > 0 ? monthlyDebt * 12 : 0;
    }
    default:
      return 0;
  }
}

function sumFixedOwnership(
  a: AssumptionMap,
  availableCharterFlightHours: number,
  catalog: readonly CatalogLineItem[]
) {
  const lines: FixedLineAmount[] = catalog
    .filter((item) => item.active && item.section === "fixed")
    .map((item) => ({ item, amount: fixedLineAmount(item, a, availableCharterFlightHours) }));
  const customItems = parseProformaCustomFixedCosts(a);
  const customTotal = sumProformaCustomFixedCosts(customItems);
  const total = lines.reduce((sum, l) => sum + l.amount, 0) + customTotal;
  return { lines, customItems, customTotal, total };
}

type VariableLine = { item: CatalogLineItem; rate: number; annual: number };
type VariableBreakdown = { lines: VariableLine[]; total: number };

/** Hourly variable lines for one bucket of flight hours (charter or owner). */
function variableBreakdown(
  hours: number,
  fuelPerHour: number,
  a: AssumptionMap,
  bucket: "charter" | "owner",
  catalog: readonly CatalogLineItem[]
): VariableBreakdown {
  const lines = catalog
    .filter((item) => item.active && item.section === "variable")
    .filter((item) => {
      const applies = item.appliesTo ?? "both";
      return applies === "both" || applies === bucket;
    })
    .map((item) => {
      const rate = item.systemCalc === "fuel" ? fuelPerHour : lineItemValue(item, a);
      return { item, rate, annual: rate * hours };
    });
  return { lines, total: lines.reduce((sum, l) => sum + l.annual, 0) };
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

  const catalog = resolveLineCatalog(synced);
  const fixed = sumFixedOwnership(synced, u.availableCharterFlightHours, catalog);
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

  const charterVar = variableBreakdown(u.availableCharterFlightHours, fuelHr, synced, "charter", catalog);
  const ownerVar = variableBreakdown(u.ownerFlightHours, fuelHr, synced, "owner", catalog);

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
  // Custom revenue items: hourly rate × charter revenue hours, or a flat annual amount.
  const customRevenue = catalog
    .filter((item) => item.active && item.section === "revenue" && item.source === "aircraft_type")
    .map((item) => {
      const rate = lineItemValue(item, synced);
      const hours = item.kind === "hourly" ? revenueHours : null;
      return { item, rate, hours, annual: hours === null ? rate : rate * hours };
    });
  const revenueActive = (calc: SystemCalcId) =>
    catalog.some((i) => i.systemCalc === calc && i.active);
  const totalRevenue = charterEnabled
    ? (revenueActive("charter_revenue") ? charterRevenue : 0) +
      (revenueActive("fuel_surcharge") ? fuelSurchargeRevenue : 0) +
      (revenueActive("fet_refund") ? jetFuelTaxCredit : 0) +
      customRevenue.reduce((sum, r) => sum + r.annual, 0)
    : 0;

  const netBeforeOwner = charterEnabled
    ? totalRevenue - fixed.total - charterVar.total
    : -fixed.total - ownerVar.total;

  const netAnnualOwner = netBeforeOwner - ownerVar.total;

  const rows: ProFormaStatementRow[] = [];

  if (charterEnabled) {
    const systemRevenue: Partial<Record<SystemCalcId, ProFormaStatementRow>> = {
      charter_revenue: revenueLine(
        "charter_revenue_block",
        "Charter Revenue",
        revenueCalc.effectiveRate,
        revenueHours,
        charterRevenue
      ),
      fuel_surcharge: revenueLine(
        "fuel_surcharge",
        "Fuel Surcharge",
        num(synced.fuel_surcharge),
        charterFlightHours,
        fuelSurchargeRevenue
      ),
      fet_refund: revenueLine(
        "fet_refund",
        FET_FUEL_TAX_REFUND_LABEL,
        jetFuelTaxCreditRatePerCharterFlightHour(synced, jetFuelTaxCreditInputs),
        charterFlightHours,
        jetFuelTaxCredit
      ),
    };
    const revenueRows = catalog
      .filter((item) => item.active && item.section === "revenue")
      .map((item): ProFormaStatementRow | null => {
        if (item.source === "system") {
          const row = item.systemCalc ? systemRevenue[item.systemCalc] : undefined;
          return row ? withLabel(row, item, defaultLabel(item)) : null;
        }
        const r = customRevenue.find((c) => c.item.key === item.key)!;
        return revenueLine(lineRowKey(item), item.label, r.rate, r.hours ?? 0, r.annual);
      })
      .filter((r): r is ProFormaStatementRow => r !== null);
    rows.push(
      section("Revenue", "revenue"),
      ...revenueRows,
      subtotalRow("total_revenue", "Total Revenue", "revenue", totalRevenue, {
        hours: revenueHours,
      })
    );
  }

  rows.push(
    section("Fixed Ownership Costs", "fixed"),
    ...fixed.lines
      .filter(({ item, amount }) => (!item.charterOnly || charterEnabled) && (!item.hideWhenZero || amount > 0))
      .map(({ item, amount }) => fixedLine(lineRowKey(item), labelFor(item), amount)),
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
      ...charterVar.lines.map((l) =>
        hourlyVarLine(`charter_${l.item.key}`, labelFor(l.item), l.rate, ch, "hourly_variable")
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
    ...ownerVar.lines.map((l) =>
      hourlyVarLine(`owner_${l.item.key}`, labelFor(l.item), l.rate, oh, "hourly_variable")
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
