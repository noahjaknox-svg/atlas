import { describe, expect, it } from "vitest";
import { buildPerOwnerEconomics, buildPerOwnerFinancing } from "@/lib/proforma-multi-owner";
import type { ProFormaStatementRow } from "@/lib/proforma-statement";
import type { ProposalOwnerProfile } from "@/lib/proposal-owners";
import { seedProformaHoursInAssumptions, OWNER_PROFORMA_HOURS_KEY } from "@/lib/proposal-owners";
import { computeUtilizationProfile } from "@/lib/proforma-utilization";

const profiles: ProposalOwnerProfile[] = [
  { sortOrder: 0, displayName: "Owner A", annualFlightHours: 200, ownershipPercent: 60 },
  { sortOrder: 1, displayName: "Owner B", annualFlightHours: 100, ownershipPercent: 40 },
];

const statementRows: ProFormaStatementRow[] = [
  { key: "total_revenue", label: "Total Revenue", kind: "subtotal", layout: "revenue", annual: 1_000_000, monthly: null, sign: "revenue" },
  { key: "total_fixed_ownership", label: "Fixed", kind: "subtotal", layout: "fixed", annual: -200_000, monthly: null, sign: "expense" },
  { key: "total_charter_variable", label: "Charter var", kind: "subtotal", layout: "hourly_variable", annual: -50_000, monthly: null, sign: "expense" },
  { key: "bridge_net_before_owner", label: "Net before owner", kind: "subtotal", layout: "bridge", annual: 400_000, monthly: null, sign: "revenue" },
];

const baseAssumptions = {
  max_annual_utilization: "500",
  owner_annual_hours: "300",
  charter_block_to_flight_ratio: "1.13",
  fuel_burn_gph: "180",
  home_fuel_price: "6",
  away_fuel_price: "7",
  home_fuel_pct: "80",
  variable_cost_per_hour: "1200",
  airframe_program_rate: "0",
  engine_program_rate: "0",
  apu_program_rate: "0",
  parts_program_rate: "0",
  inspection_reserve_rate: "0",
  maintenance_reserve_rate: "0",
  trip_expense_per_hour: "0",
  financing_enabled: "yes",
  aircraft_value: "5000000",
  monthly_debt_service: "12000",
};

function sumAllocated(
  rows: ReturnType<typeof buildPerOwnerEconomics>,
  pick: (r: (typeof rows)[0]) => number
): number {
  return rows.reduce((s, r) => s + pick(r), 0);
}

describe("buildPerOwnerEconomics", () => {
  it("hybrid: pooled revenue splits by equity", () => {
    const perOwner = buildPerOwnerEconomics(baseAssumptions, profiles, statementRows, "hybrid");
    const allocRevenue = sumAllocated(perOwner, (r) =>
      r.lines.find((l) => l.label === "Allocated revenue")!.annual
    );
    expect(allocRevenue).toBeCloseTo(1_000_000, 0);
    expect(perOwner[0].lines.find((l) => l.label === "Allocated revenue")!.annual).toBeCloseTo(
      600_000,
      0
    );
    expect(perOwner[1].lines.find((l) => l.label === "Allocated revenue")!.annual).toBeCloseTo(
      400_000,
      0
    );
  });

  it("allocates net before owner by equity under hybrid", () => {
    const perOwner = buildPerOwnerEconomics(baseAssumptions, profiles, statementRows, "hybrid");
    const sumNet = sumAllocated(perOwner, (r) =>
      r.lines.find((l) => l.label === "Net before owner use")!.annual
    );
    expect(sumNet).toBeCloseTo(400_000, 0);
  });
});

describe("buildPerOwnerFinancing", () => {
  it("splits monthly debt by equity when financing enabled", () => {
    const rows = buildPerOwnerFinancing(baseAssumptions, profiles, "hybrid");
    expect(rows).toHaveLength(2);
    const monthlySum = rows.reduce((s, r) => s + r.monthlyDebtService, 0);
    expect(monthlySum).toBeCloseTo(12_000, 0);
    expect(rows[0].monthlyDebtService).toBeCloseTo(7200, 0);
    expect(rows[0].impliedEquity).toBeCloseTo(3_000_000, 0);
  });
});

describe("shared charter hours", () => {
  it("seeds owner_annual_hours from profile defaults and reduces charter", () => {
    const seeded = seedProformaHoursInAssumptions(baseAssumptions, profiles);
    expect(seeded.owner_annual_hours).toBe("300");
    expect(seeded[OWNER_PROFORMA_HOURS_KEY]).toBe(JSON.stringify([200, 100]));
    const util = computeUtilizationProfile(seeded);
    expect(util.ownerFlightHours).toBe(300);
    expect(util.availableCharterFlightHours).toBe(200);
  });
});
