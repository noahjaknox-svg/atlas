import { describe, it, expect } from "vitest";
import { parseOperatingJson, CREW_OPERATING_DEFAULTS } from "@/lib/crew/types";
import { B300_PERFORMANCE_AXES, buildB300Grid } from "@/lib/crew/seed-grids";

describe("crew operating parse", () => {
  it("keeps summer and winter pax weights separate", () => {
    const o = parseOperatingJson({
      paxWeightSummer: 190,
      paxWeightWinter: 195,
    });
    expect(o.paxWeightSummer).toBe(190);
    expect(o.paxWeightWinter).toBe(195);
  });

  it("uses semantic GOM field names", () => {
    const o = parseOperatingJson({
      landingRunwayPercent: 60,
      alternateRunwayPercent: 70,
      wetRunwayPercent: 15,
    });
    expect(o.landingRunwayPercent).toBe(60);
    expect(o.alternateRunwayPercent).toBe(70);
    expect(o.wetRunwayPercent).toBe(15);
  });

  it("fills defaults for missing keys", () => {
    const o = parseOperatingJson({});
    expect(o.mtowLb).toBe(CREW_OPERATING_DEFAULTS.mtowLb);
  });
});

describe("B300 performance grid", () => {
  it("builds 11×10×9 grid", () => {
    const grid = buildB300Grid("takeoffFieldLength");
    expect(grid.length).toBe(B300_PERFORMANCE_AXES.pressureAltitudeFt.length);
    expect(grid[0].length).toBe(B300_PERFORMANCE_AXES.weightLb.length);
    expect(grid[0][0].length).toBe(B300_PERFORMANCE_AXES.oatC.length);
  });

  it("includes null cells outside envelope", () => {
    const grid = buildB300Grid("takeoffFieldLength");
    const hasNull = grid.some((pa) => pa.some((w) => w.some((v) => v === null)));
    expect(hasNull).toBe(true);
  });
});
