import { describe, expect, it } from "vitest";
import { deriveAfmStatus } from "@/lib/crew/afm-status";
import { canonicalCrewTypeCode } from "@/lib/crew/type-codes";
import { parseCrewSyncPolicy } from "@/lib/crew/org-policy";
import { CREW_SYNC_POLICY } from "@/lib/crew/performance-model";

describe("canonicalCrewTypeCode", () => {
  it("aliases LJ45 to LR45", () => {
    expect(canonicalCrewTypeCode("LJ45")).toBe("LR45");
    expect(canonicalCrewTypeCode("lr45")).toBe("LR45");
  });

  it("leaves CL30 alone (not aliased to CL35)", () => {
    expect(canonicalCrewTypeCode("CL30")).toBe("CL30");
  });
});

describe("deriveAfmStatus", () => {
  it("marks missing when empty", () => {
    expect(deriveAfmStatus({ code: "CL35", hasPerformanceModel: false, grids: [] })).toEqual({
      afmStatus: "missing",
    });
  });

  it("marks B300 with POH takeoff + stand-in landing as partial", () => {
    const result = deriveAfmStatus({
      code: "B300",
      hasPerformanceModel: true,
      grids: [
        {
          metric: "takeoffFieldLength",
          source: "King Air 350 B300 POH Section 5, flaps up, A/C & bleed ON",
        },
        {
          metric: "landingDistance",
          source:
            "Crew calibrated normal-landing model (density-altitude based), evaluated onto the same axes as takeoff.",
        },
      ],
    });
    expect(result.afmStatus).toBe("partial");
    expect(result.afmNotes).toMatch(/stand-in|calibrat/i);
  });

  it("marks complete only when both grids are POH-sourced + model", () => {
    const result = deriveAfmStatus({
      code: "CL35",
      hasPerformanceModel: true,
      grids: [
        { metric: "takeoffFieldLength", source: "CL35 AFM Section 5 Normal Takeoff" },
        { metric: "landingDistance", source: "CL35 AFM Section 5 Normal Landing" },
      ],
    });
    expect(result.afmStatus).toBe("complete");
  });
});

describe("parseCrewSyncPolicy", () => {
  it("accepts defaults and rejects zeros", () => {
    expect(parseCrewSyncPolicy(CREW_SYNC_POLICY)).toEqual(CREW_SYNC_POLICY);
    expect(parseCrewSyncPolicy({ ...CREW_SYNC_POLICY, minRunwayFt: 0 })).toBeNull();
  });
});
