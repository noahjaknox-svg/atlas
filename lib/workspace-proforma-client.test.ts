import { describe, expect, it } from "vitest";
import { buildProFormaStatement } from "@/lib/proforma-statement";
import { buildClientProFormaSummary } from "@/lib/client-proforma-summary";
import { PROFORMA_VISIBILITY_KEY } from "@/lib/proforma-line-visibility";
import {
  PROFORMA_CUSTOM_FIXED_COSTS_KEY,
  serializeProformaCustomFixedCosts,
} from "@/lib/proforma-custom-fixed-costs";
import {
  applyClientProFormaOverrides,
  computeWorkspaceProFormaForClient,
  resolveClientCrewSummary,
  resolvePortalCrewStepFloor,
} from "@/lib/workspace-proforma-client";
import type { ProposalOwnerProfile } from "@/lib/proposal-owners";

const USAGE_TIERS = {
  max_usage_1_pilot: "0",
  max_usage_2_pilots: "450",
  max_usage_3_pilots: "600",
  max_usage_4_pilots: "700",
  max_usage_5_pilots: "800",
  max_usage_6_pilots: "900",
  crew_step_index: "0",
  lead_pilot_enabled: "no",
  owner_annual_hours: "250",
  max_annual_utilization: "450",
  charter_block_to_flight_ratio: "1.13",
  usage_type: "part_91_135",
  variable_cost_per_hour: "1200",
  pic_count: "1",
  sic_count: "1",
  crew_total: "400000",
};

describe("fixed ownership sort order", () => {
  it("sorts fixed ownership line items largest to smallest by annual amount", () => {
    const { rows } = buildProFormaStatement({
      ...USAGE_TIERS,
      crew_total: "500000",
      hangar_annual: "120000",
      insurance_annual: "80000",
      management_fee: "60000",
      wifi_annual: "24000",
      usage_type: "part_91",
    });

    const fixedStart = rows.findIndex(
      (r) => r.kind === "section" && r.layout === "fixed"
    );
    expect(fixedStart).toBeGreaterThanOrEqual(0);

    const fixedLines: number[] = [];
    for (let i = fixedStart + 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.kind === "section") break;
      if (row.kind === "line" && row.layout === "fixed" && row.annual != null) {
        fixedLines.push(Math.abs(row.annual));
      }
    }

    expect(fixedLines.length).toBeGreaterThan(2);
    for (let i = 1; i < fixedLines.length; i++) {
      expect(fixedLines[i - 1]).toBeGreaterThanOrEqual(fixedLines[i]);
    }
  });
});

describe("resolvePortalCrewStepFloor", () => {
  it("ignores a higher workspace crew step when defaulting portal crew", () => {
    const assumptions = {
      ...USAGE_TIERS,
      crew_step_index: "3",
      pic_count: "3",
      sic_count: "2",
    };
    expect(resolvePortalCrewStepFloor(assumptions, 250)).toBe(0);

    const calc = computeWorkspaceProFormaForClient(assumptions, {
      ownerHours: 250,
      crewStepIndex: resolvePortalCrewStepFloor(assumptions, 250),
    });
    expect(calc.calculationAssumptions.crew_step_index).toBe("0");
    expect(calc.calculationAssumptions.pic_count).toBe("1");
    expect(calc.calculationAssumptions.sic_count).toBe("1");
  });

  it("respects default minimum crew from warehouse", () => {
    const assumptions = {
      ...USAGE_TIERS,
      default_minimum_crew: "3",
      owner_annual_hours: "100",
    };
    expect(resolvePortalCrewStepFloor(assumptions, 100)).toBe(1);
  });

  it("steps up when owner hours require more crew than the minimum", () => {
    expect(resolvePortalCrewStepFloor(USAGE_TIERS, 500)).toBe(1);
  });
});

describe("applyClientProFormaOverrides", () => {
  it("auto-steps crew when owner hours exceed 2-pilot capacity", () => {
    const next = applyClientProFormaOverrides(USAGE_TIERS, { ownerHours: 500 });
    expect(next.crew_step_index).toBe("1");
    expect(next.pic_count).toBe("2");
    expect(next.sic_count).toBe("1");
    expect(next.max_annual_utilization).toBe("600");
  });

  it("is idempotent when owner hours match stored assumptions", () => {
    const base = { ...USAGE_TIERS, owner_annual_hours: "250" };
    const patched = applyClientProFormaOverrides(base, { ownerHours: 250 });
    expect(patched.crew_step_index).toBe(base.crew_step_index);
    expect(patched.max_annual_utilization).toBe(base.max_annual_utilization);
  });

  it("patches multi-owner JSON and total before crew step", () => {
    const profiles: ProposalOwnerProfile[] = [
      { sortOrder: 0, displayName: "Owner A", annualFlightHours: 200, ownershipPercent: 50 },
      { sortOrder: 1, displayName: "Owner B", annualFlightHours: 150, ownershipPercent: 50 },
    ];
    const next = applyClientProFormaOverrides(USAGE_TIERS, {
      ownerProfiles: profiles,
      proformaOwnerHours: [300, 250],
    });
    expect(next.owner_annual_hours).toBe("550");
    expect(next.owner_proforma_hours_json).toBe("[300,250]");
    expect(next.crew_step_index).toBe("1");
  });
});

describe("computeWorkspaceProFormaForClient", () => {
  it("updates charter flight hours when owner hours increase", () => {
    const low = computeWorkspaceProFormaForClient(USAGE_TIERS, { ownerHours: 100 });
    const high = computeWorkspaceProFormaForClient(USAGE_TIERS, { ownerHours: 400 });
    const lowCharter = parseFloat(low.calculationAssumptions.charter_flight_hours ?? "0");
    const highCharter = parseFloat(high.calculationAssumptions.charter_flight_hours ?? "0");
    expect(highCharter).toBeLessThan(lowCharter);
  });

  it("derives financing and adds statement rows when financing is enabled", () => {
    const calc = computeWorkspaceProFormaForClient(
      {
        ...USAGE_TIERS,
        aircraft_value: "5000000",
        down_payment_percent: "20",
        interest_rate: "6",
        term_months: "120",
        balloon_payment: "0",
      },
      {
        aircraftValue: 5_000_000,
        financingEnabled: true,
        downPaymentPercent: 20,
        interestRate: 6,
        termMonths: 120,
        balloonPayment: 0,
      }
    );

    expect(calc.calculationAssumptions.financing_enabled).toBe("yes");
    expect(parseFloat(calc.calculationAssumptions.down_payment ?? "0")).toBe(1_000_000);
    expect(parseFloat(calc.calculationAssumptions.monthly_debt_service ?? "0")).toBeGreaterThan(0);

    const debtRow = calc.statementRows.find((r) => r.key === "financing_debt_pl");
    expect(debtRow?.layout).toBe("fixed");
    expect(debtRow?.annual).toBeLessThan(0);
    const fixedTotal = calc.statementRows.find((r) => r.key === "total_fixed_ownership");
    expect(fixedTotal?.annual).toBeLessThan(0);
  });
});

describe("proforma line visibility on portal", () => {
  const visibilityBase = {
    ...USAGE_TIERS,
    subscriptions_annual: "12000",
    home_fuel_price: "6",
    away_fuel_price: "7",
    home_fuel_pct: "80",
    fuel_burn_gph: "400",
    aircraft_value: "25000000",
    insurance_mode: "fixed",
    insurance_annual: "50000",
  };

  it("computeWorkspaceProFormaForClient omits hidden subscriptions_pl", () => {
    const calc = computeWorkspaceProFormaForClient({
      ...visibilityBase,
      [PROFORMA_VISIBILITY_KEY]: JSON.stringify({ subscriptions_pl: false }),
    });
    expect(calc.statementRows.some((r) => r.key === "subscriptions_pl")).toBe(false);
  });

  it("buildClientProFormaSummary omits hidden lines from calculationAssumptions", () => {
    const summary = buildClientProFormaSummary({
      id: "a1",
      label: "Test",
      aircraftProfileMode: "general",
      aircraftTypeLabel: null,
      portalSubtitle: null,
      manufacturer: null,
      model: null,
      tailNumber: null,
      year: null,
      category: null,
      proposedHomeBase: null,
      clientSummary: null,
      portalImageUrl: null,
      portalVideoUrl: null,
      portalSpecHighlights: [],
      assumptions: {},
      calculationAssumptions: {
        ...visibilityBase,
        [PROFORMA_VISIBILITY_KEY]: JSON.stringify({ subscriptions_pl: false }),
      },
      metrics: {
        netAnnualCost: 0,
        netMonthlyCost: 0,
        ownerHours: 250,
        charterRevenueOffset: 0,
        costPerOwnerHour: 0,
        aircraftValue: 25_000_000,
      },
      proForma: {
        blendedFuelPrice: 0,
        fuelCostPerHour: 0,
        variableCostPerHour: 0,
        charterRevenue: 0,
        fuelSurchargeRevenue: 0,
        totalRevenue: 0,
        charterVariableCost: 0,
        ownerVariableCost: 0,
        netBeforeOwner: 0,
        netAnnualCost: 0,
        netMonthlyCost: 0,
        costPerOwnerHour: 0,
        insuranceEstimate: 0,
        lineItems: [],
      },
    });
    expect(summary.statementRows.some((r) => r.key === "subscriptions_pl")).toBe(false);
  });
});

describe("custom fixed costs on portal", () => {
  it("computeWorkspaceProFormaForClient includes custom lines in statement rows", () => {
    const calc = computeWorkspaceProFormaForClient({
      ...USAGE_TIERS,
      home_fuel_price: "6",
      away_fuel_price: "7",
      home_fuel_pct: "80",
      fuel_burn_gph: "400",
      aircraft_value: "25000000",
      insurance_mode: "fixed",
      insurance_annual: "50000",
      [PROFORMA_CUSTOM_FIXED_COSTS_KEY]: serializeProformaCustomFixedCosts([
        { id: "legal", name: "Legal retainer", amount: 15000 },
      ]),
    });

    expect(calc.statementRows.some((r) => r.label === "Legal retainer")).toBe(true);
    expect(calc.fixedCostBreakdown.some((i) => i.label === "Legal retainer")).toBe(true);
  });
});

describe("resolveClientCrewSummary", () => {
  it("reports crew composition and utilization", () => {
    const summary = resolveClientCrewSummary(USAGE_TIERS);
    expect(summary.composition).toContain("PIC");
    expect(summary.totalPilots).toBe(2);
    expect(summary.maxAnnualUtilization).toBe(450);
    expect(summary.ownerHours).toBe(250);
    expect(summary.charterFlightHours).toBeGreaterThan(0);
  });

  it("flags when owner hours require higher crew step", () => {
    const summary = resolveClientCrewSummary(USAGE_TIERS, {
      ownerProfiles: [],
    });
    const high = applyClientProFormaOverrides(USAGE_TIERS, { ownerHours: 500 });
    const highSummary = resolveClientCrewSummary(high);
    expect(highSummary.requiredByOwnerHours).toBe(true);
    expect(summary.requiredByOwnerHours).toBe(false);
  });
});
