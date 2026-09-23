import { describe, expect, it } from "vitest";
import {
  buildProFormaComparison,
  compareInputsFromPayload,
  defaultAircraftValue,
  parseCompareParam,
  MAX_COMPARE_AIRCRAFT,
  type CompareAircraftInput,
  type SharedCompareInputs,
} from "@/lib/client-proforma-compare";
import { computeWorkspaceProFormaForClient, resolvePortalCrewStepFloor, stringsToAssumptionMap } from "@/lib/workspace-proforma-client";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";
import type { AircraftSnapshotEntry } from "@/lib/portal-aircraft-types";

const baseMap: Record<string, string> = {
  aircraft_value: "25000000",
  owner_annual_hours: "250",
  usage_type: "part_91",
  home_fuel_price: "6",
  away_fuel_price: "7",
  home_fuel_pct: "80",
  fuel_burn_gph: "400",
  max_annual_utilization: "500",
  charter_block_to_flight_ratio: "1.13",
  variable_cost_per_hour: "1200",
  crew_total: "500000",
  max_usage_1_pilot: "0",
  max_usage_2_pilots: "450",
  max_usage_3_pilots: "600",
  crew_step_index: "0",
  lead_pilot_enabled: "no",
  pic_count: "1",
  sic_count: "1",
};

function aircraft(id: string, overrides: Record<string, string> = {}): CompareAircraftInput {
  return {
    id,
    label: `Aircraft ${id}`,
    tailNumber: null,
    portalImageUrl: null,
    calculationAssumptions: { ...baseMap, ...overrides },
    ownerProfiles: [],
  };
}

const shared: SharedCompareInputs = {
  proformaOwnerHours: [250],
  crewStepIndex: 0,
  financingEnabled: false,
};

describe("buildProFormaComparison", () => {
  it("matches the single-aircraft computation for each column", () => {
    const a = aircraft("a");
    const b = aircraft("b", { fuel_burn_gph: "250", aircraft_value: "12000000" });
    const result = buildProFormaComparison([a, b], shared);

    expect(result.columns.map((c) => c.id)).toEqual(["a", "b"]);
    for (const input of [a, b]) {
      const assumptions = stringsToAssumptionMap(input.calculationAssumptions);
      const crew = Math.max(0, resolvePortalCrewStepFloor(assumptions, 250));
      const single = computeWorkspaceProFormaForClient(assumptions, {
        aircraftValue: defaultAircraftValue(input),
        ownerHours: 250,
        crewStepIndex: crew,
        financingEnabled: false,
      });
      const col = result.columns.find((c) => c.id === input.id)!;
      expect(col.metrics.netAnnualCost).toBeCloseTo(single.metrics.netAnnualCost);
    }
  });

  it("applies shared owner hours to every column", () => {
    const low = buildProFormaComparison([aircraft("a"), aircraft("b")], shared);
    const high = buildProFormaComparison([aircraft("a"), aircraft("b")], {
      ...shared,
      proformaOwnerHours: [400],
    });
    for (let i = 0; i < 2; i++) {
      expect(high.columns[i]!.metrics.ownerHours).toBe(400);
      expect(Math.abs(high.columns[i]!.metrics.netAnnualCost)).toBeGreaterThan(
        Math.abs(low.columns[i]!.metrics.netAnnualCost)
      );
    }
  });

  it("uses per-aircraft value overrides and defaults to each aircraft's own value", () => {
    const result = buildProFormaComparison(
      [aircraft("a"), aircraft("b", { aircraft_value: "12000000" })],
      shared,
      { a: 30_000_000 }
    );
    expect(result.columns[0]!.aircraftValue).toBe(30_000_000);
    expect(result.columns[1]!.aircraftValue).toBe(12_000_000);
    expect(result.metricRows.find((r) => r.key === "aircraftValue")!.best).toBeNull();
  });

  it("raises the shared crew step to each aircraft's minimum", () => {
    // Above the 2-pilot limit (450) this aircraft needs a bigger crew; the other doesn't.
    const tight = aircraft("tight");
    const roomy = aircraft("roomy", { max_usage_2_pilots: "900", max_usage_3_pilots: "1200" });
    const hours = 500;
    const result = buildProFormaComparison([tight, roomy], {
      ...shared,
      proformaOwnerHours: [hours],
    });
    const tightFloor = resolvePortalCrewStepFloor(stringsToAssumptionMap(tight.calculationAssumptions), hours);
    const roomyFloor = resolvePortalCrewStepFloor(stringsToAssumptionMap(roomy.calculationAssumptions), hours);
    expect(tightFloor).toBeGreaterThan(roomyFloor);
    expect(result.columns[0]!.crewStepIndex).toBe(tightFloor);
    expect(result.columns[0]!.crewStepRaised).toBe(true);
    expect(result.columns[1]!.crewStepIndex).toBe(Math.max(0, roomyFloor));
  });

  it("marks the cheaper aircraft as best on net cost", () => {
    const pricey = aircraft("pricey", { fuel_burn_gph: "600" });
    const cheap = aircraft("cheap", { fuel_burn_gph: "200" });
    const result = buildProFormaComparison([pricey, cheap], shared);
    const net = result.metricRows.find((r) => r.key === "netAnnualCost")!;
    expect(net.values[1]!).toBeLessThan(net.values[0]!);
    expect(net.best).toBe(1);
  });

  it("does not mark a best value when columns tie", () => {
    const result = buildProFormaComparison([aircraft("a"), aircraft("b")], shared);
    expect(result.metricRows.find((r) => r.key === "netAnnualCost")!.best).toBeNull();
    for (const row of result.statementRows) {
      expect(row.best.annual).toBeNull();
    }
  });

  it("aligns statement rows by key, leaving a gap where an aircraft has no such line", () => {
    const withCustom = aircraft("custom", {
      proforma_custom_fixed_costs: JSON.stringify([{ id: "x1", name: "Detailing", amount: 24000 }]),
    });
    const plain = aircraft("plain");
    const result = buildProFormaComparison([plain, withCustom], shared);

    const keys = result.statementRows.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const row of result.statementRows) {
      expect(row.values).toHaveLength(2);
    }
    const onlyCustom = result.statementRows.filter((r) => r.values[0] === null && r.values[1] !== null);
    expect(onlyCustom.length).toBeGreaterThan(0);
    expect(onlyCustom.some((r) => r.label === "Detailing")).toBe(true);
    const plainKeys = new Set(
      computeWorkspaceProFormaForClient(stringsToAssumptionMap(plain.calculationAssumptions), {
        ownerHours: 250,
      }).statementRows.map((r) => r.key)
    );
    for (const row of onlyCustom) expect(plainKeys.has(row.key)).toBe(false);
  });
});

describe("compareInputsFromPayload", () => {
  it("skips lightweight entries that can't be recomputed in the browser", () => {
    const full = { id: "full", label: "Full", tailNumber: null, portalImageUrl: null, calculationAssumptions: baseMap, ownerProfiles: [] };
    const lightweight = { id: "light", label: "Light", tailNumber: null, portalImageUrl: null };
    const payload = {
      aircraftList: [full, lightweight] as unknown as AircraftSnapshotEntry[],
      primaryAircraftInstanceId: "full",
    } as unknown as ProposalSnapshotPayload;
    expect(compareInputsFromPayload(payload).map((a) => a.id)).toEqual(["full"]);
  });
});

describe("parseCompareParam", () => {
  it("keeps known ids, dedupes, and caps the count", () => {
    const known = ["a", "b", "c", "d"];
    expect(parseCompareParam("a,b,a,zzz,c,d", known)).toEqual(["a", "b", "c"]);
    expect(parseCompareParam("a,b,a,zzz,c,d", known)).toHaveLength(MAX_COMPARE_AIRCRAFT);
    expect(parseCompareParam(null, known)).toEqual([]);
  });
});
