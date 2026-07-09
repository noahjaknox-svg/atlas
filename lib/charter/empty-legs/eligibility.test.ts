import { describe, expect, it } from "vitest";
import type { ScheduleRawEventType } from "@prisma/client";
import {
  buildRouteKey,
  durationMinutesBetween,
  emptyLegPublicExpiryAt,
  isEligibleEmptyLegEvent,
  isEmptyLegPast,
  jetInsightTripUrl,
} from "@/lib/charter/empty-legs/eligibility";

describe("buildRouteKey", () => {
  it("uppercases and joins ICAOs", () => {
    expect(buildRouteKey("ksdl", "kase")).toBe("KSDL-KASE");
  });
});

describe("isEligibleEmptyLegEvent", () => {
  const base = {
    rawEventType: "positioning" as ScheduleRawEventType,
    paxCount: 0,
    externalUrl: "https://portal.jetinsight.com/trips/T1",
    externalTripCode: "T1",
    depIcao: "KSDL",
    arrIcao: "KASE",
    deletedAt: null as Date | null,
  };

  it("accepts positioning with pax 0 and trip metadata", () => {
    expect(isEligibleEmptyLegEvent(base)).toBe(true);
  });

  it("rejects deleted events", () => {
    expect(isEligibleEmptyLegEvent({ ...base, deletedAt: new Date() })).toBe(false);
  });

  it("rejects non-positioning", () => {
    expect(
      isEligibleEmptyLegEvent({ ...base, rawEventType: "owner" as ScheduleRawEventType })
    ).toBe(false);
  });

  it("rejects non-zero pax", () => {
    expect(isEligibleEmptyLegEvent({ ...base, paxCount: 2 })).toBe(false);
  });

  it("rejects missing trip url or code", () => {
    expect(isEligibleEmptyLegEvent({ ...base, externalUrl: null })).toBe(false);
    expect(isEligibleEmptyLegEvent({ ...base, externalTripCode: "  " })).toBe(false);
  });

  it("rejects missing airports", () => {
    expect(isEligibleEmptyLegEvent({ ...base, depIcao: "" })).toBe(false);
  });
});

describe("durationMinutesBetween", () => {
  it("rounds positive duration", () => {
    const start = new Date("2026-01-01T12:00:00.000Z");
    const end = new Date("2026-01-01T13:30:00.000Z");
    expect(durationMinutesBetween(start, end)).toBe(90);
  });

  it("clamps negative to zero", () => {
    const start = new Date("2026-01-01T13:00:00.000Z");
    const end = new Date("2026-01-01T12:00:00.000Z");
    expect(durationMinutesBetween(start, end)).toBe(0);
  });
});

describe("expiry helpers", () => {
  it("uses sliding window end when present", () => {
    const dep = new Date("2026-06-01T10:00:00.000Z");
    const win = new Date("2026-06-01T18:00:00.000Z");
    expect(emptyLegPublicExpiryAt({ scheduledDepartureAt: dep, slidingWindowEndAt: win })).toEqual(
      win
    );
  });

  it("falls back to departure", () => {
    const dep = new Date("2026-06-01T10:00:00.000Z");
    expect(
      emptyLegPublicExpiryAt({ scheduledDepartureAt: dep, slidingWindowEndAt: null })
    ).toEqual(dep);
  });

  it("detects past legs", () => {
    const now = new Date("2026-06-02T00:00:00.000Z");
    expect(
      isEmptyLegPast(
        {
          scheduledDepartureAt: new Date("2026-06-01T10:00:00.000Z"),
          slidingWindowEndAt: null,
        },
        now
      )
    ).toBe(true);
    expect(
      isEmptyLegPast(
        {
          scheduledDepartureAt: new Date("2026-06-03T10:00:00.000Z"),
          slidingWindowEndAt: null,
        },
        now
      )
    ).toBe(false);
  });
});

describe("jetInsightTripUrl", () => {
  it("builds portal url", () => {
    expect(jetInsightTripUrl("ABC123")).toBe("https://portal.jetinsight.com/trips/ABC123");
  });
});
