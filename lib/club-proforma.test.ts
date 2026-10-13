import { describe, expect, it } from "vitest";
import {
  CLUB_DEFAULTS,
  SPEC_SWITCHES,
  WORKBOOK_SWITCHES,
  acquisitionTrigger,
  annualDebtService,
  compareStructures,
  computeClubModel,
  computeClubMonthly,
  computeScaling,
  computeSteadyState,
  interimLiftTable,
  membersPerAircraft,
  resolveAcquisitionMonths,
  withInputs,
} from "./club-proforma";

const spec = withInputs(SPEC_SWITCHES);
const workbook = withInputs(WORKBOOK_SWITCHES);

describe("club pro forma: spec oracle", () => {
  it("derives debt service, capacity and trigger", () => {
    expect(Math.round(annualDebtService(spec))).toBe(1_377_174);
    expect(membersPerAircraft(spec)).toBe(10);
    expect(acquisitionTrigger(spec)).toBe(7);
  });

  it("nets $727,826 per aircraft at 10 members and scales linearly", () => {
    const scaling = computeScaling(spec);
    expect(scaling.map((s) => Math.round(s.clubNet))).toEqual([
      727_826, 1_455_651, 2_183_477, 2_911_303,
    ]);
    expect(Math.round(scaling[0].netPerMember)).toBe(72_783);
    expect(scaling.every((s) => !s.overCapacity)).toBe(true);
  });

  it("matches the one-aircraft waterfall", () => {
    const s = computeSteadyState(spec, 1, 10);
    expect(s.duesRevenue).toBe(1_800_000);
    expect(s.flightRevenue).toBe(4_500_000);
    expect(s.directCost).toBe(1_750_000);
    expect(s.operatingShare).toBe(945_000);
  });

  it("compares the three structures at 3 aircraft / 30 members", () => {
    const c = compareStructures(spec, { aircraft: 3, members: 30 });
    const owner = Object.fromEntries(c.owner.map((o) => [o.key, o]));
    const pj = Object.fromEntries(c.prismjet.map((p) => [p.key, p]));

    expect(Math.round(owner.licensing.silverleafAnnualCash)).toBe(1_445_000);
    expect(Math.round(owner.jv.silverleafAnnualCash)).toBe(1_091_738);
    expect(Math.round(owner.ownerFinanced.silverleafAnnualCash)).toBe(1_637_608);

    expect(Math.round(pj.licensing.annualCash)).toBe(3_573_477);
    expect(Math.round(pj.jv.annualCash)).toBe(3_926_738);
    expect(Math.round(pj.ownerFinanced.annualCash)).toBe(3_380_869);

    expect(Math.round(c.principalRetired)).toBe(3_605_715);
    expect(Math.round(owner.jv.silverleafFleetEquity)).toBe(6_902_857);
    expect(Math.round(owner.ownerFinanced.silverleafFleetEquity)).toBe(10_354_286);
    expect(owner.licensing.silverleafFleetEquity).toBe(0);

    expect(owner.licensing.silverleafBridgeCapital).toBe(0);
    expect(owner.jv.silverleafBridgeCapital).toBe(1_700_000);
    expect(owner.ownerFinanced.silverleafBridgeCapital).toBe(3_400_000);
  });

  it("is a loss at 75 hours and 15 members per aircraft", () => {
    const bad = withInputs({
      ...SPEC_SWITCHES,
      allocationHours: 75,
      flownHoursPerMember: 75,
    });
    const s = computeSteadyState(bad, 1, 15);
    expect(s.overCapacity).toBe(true);
    expect(s.offFleetOccupiedHours).toBeCloseTo(615, 5);
    expect(s.clubNet).toBeLessThan(0);
  });

  it("builds the interim lift margin table", () => {
    const rows = interimLiftTable(spec);
    const at = (rate: number, dh: number) =>
      rows.find((r) => r.rate === rate)!.margins.find((m) => m.deadhead === dh)!.margin;
    expect(at(7_000, 0.25)).toBe(250);
    expect(at(7_000, 0.4)).toBe(-800);
    expect(at(6_000, 0.25)).toBe(1_500);
    expect(at(5_500, 0.4)).toBe(1_300);
  });
});

describe("club pro forma: workbook oracle (Sheet1)", () => {
  const result = computeClubMonthly(workbook, 62);
  const m = (n: number) => result.months[n - 1];

  it("starts with the founding cohort funding the first down payment", () => {
    expect(m(1).members).toBe(10);
    expect(m(1).initiationRevenue).toBe(5_000_000);
    expect(m(1).downPayment).toBe(3_400_000);
    expect(m(1).net).toBeCloseTo(1_328_985.47, 1);
    expect(m(1).cumulative).toBeCloseTo(1_328_985.47, 1);
  });

  it("carries the conformity lag (all hours off-fleet until month 5)", () => {
    expect(m(3).operationalFleet).toBe(0);
    expect(m(3).offFleetOccupiedHours).toBeCloseTo(41.67, 1);
    expect(m(3).offFleetCost).toBeCloseTo(500_000, 0);
    expect(m(5).operationalFleet).toBe(1);
  });

  it("matches monthly net and cumulative balance at checkpoints", () => {
    expect(m(2).net).toBeCloseTo(-271_014.53, 1);
    expect(m(3).cumulative).toBeCloseTo(786_956.2, 0);
    expect(m(4).members).toBe(11);
    expect(m(8).cumulative).toBeCloseTo(1_753_134, -1);
    expect(m(19).fleet).toBe(2);
    expect(m(23).cumulative).toBeCloseTo(-397_010, -1);
    expect(m(48).cumulative).toBeCloseTo(4_832_043, -1);
  });

  it("ends month 62 at about $7.97M with 25 members on 2 aircraft", () => {
    expect(m(62).members).toBe(25);
    expect(m(62).fleet).toBe(2);
    expect(m(62).cumulative).toBeCloseTo(7_970_511, -1);
  });

  it("reports the dip around the second aircraft", () => {
    expect(result.lowPoint?.month).toBe(23);
    expect(result.lowPoint!.cumulative).toBeCloseTo(-397_010, -1);
  });
});

describe("club pro forma: acquisition and ramp", () => {
  it("acquires on the initiation trigger by default", () => {
    // 10 founding members (>= 7) -> first aircraft in month 1; 17 members -> second.
    const months = resolveAcquisitionMonths(CLUB_DEFAULTS, 60);
    expect(months[0]).toBe(1);
    expect(months.length).toBeGreaterThanOrEqual(2);
  });

  it("caps the fleet at maxAircraft", () => {
    const months = resolveAcquisitionMonths(withInputs({ membersPerYear: 60 }), 60);
    expect(months.length).toBeLessThanOrEqual(CLUB_DEFAULTS.maxAircraft);
  });

  it("bills hours above allocation at cost plus markup", () => {
    const over = withInputs({ ...SPEC_SWITCHES, flownHoursPerMember: 60 });
    const s = computeSteadyState(over, 2, 10);
    expect(s.overageRevenue).toBeCloseTo(10 * 10 * 3_500 * 1.1, 5);
    expect(s.flightRevenue).toBe(10 * 50 * 9_000);
  });
});

describe("club pro forma: member cap", () => {
  it("never admits more members than the full fleet can serve", () => {
    const fast = withInputs({ ...SPEC_SWITCHES, foundingMembers: 10, membersPerYear: 10 });
    const months = computeClubMonthly(fast, 60).months;
    expect(Math.max(...months.map((m) => m.members))).toBe(40);
    expect(months[59].fleet).toBe(4);
    // Outside lift only while each new aircraft is conformed; none once the fleet is complete.
    expect(months.slice(0, 36).some((m) => m.offFleetOccupiedHours > 0)).toBe(true);
    expect(months.slice(36).every((m) => m.offFleetOccupiedHours === 0)).toBe(true);
  });

  it("honours an explicit cap", () => {
    const capped = withInputs({ membersPerYear: 10, memberCap: 25 });
    expect(Math.max(...computeClubMonthly(capped, 60).months.map((m) => m.members))).toBe(25);
  });
});

describe("club pro forma: views", () => {
  it("keeps PrismJet economics out of the owner view", () => {
    const { owner, prismjet } = computeClubModel(spec);
    const serialised = JSON.stringify(owner);
    expect(serialised).not.toContain("prismjet");
    expect(serialised).not.toContain("interimLift");
    expect(owner.structures.owner).toHaveLength(3);
    expect(prismjet.structures).toHaveLength(3);
    expect(Math.round(prismjet.operatingShareAnnual)).toBe(2_835_000);
  });
});
