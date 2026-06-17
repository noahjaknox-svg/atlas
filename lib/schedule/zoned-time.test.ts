import { describe, expect, it } from "vitest";
import { blockPosition } from "@/lib/schedule/build-timeline";
import {
  formatZonedDateKey,
  startOfZonedDay,
} from "@/lib/schedule/zoned-time";

describe("startOfZonedDay", () => {
  it("maps Phoenix local midnight to 07:00 UTC", () => {
    const anchor = new Date("2026-06-22T15:00:00.000Z");
    expect(startOfZonedDay(anchor, "America/Phoenix").toISOString()).toBe(
      "2026-06-22T07:00:00.000Z"
    );
  });

  it("labels calendar day in Phoenix", () => {
    const instant = new Date("2026-06-22T07:00:00.000Z");
    expect(formatZonedDateKey(instant, "America/Phoenix")).toBe("2026-06-22");
  });
});

describe("full-day Phoenix hold positioning", () => {
  it("spans one column in a 14-day Phoenix grid", () => {
    const rangeStart = startOfZonedDay(new Date("2026-06-11T12:00:00Z"), "America/Phoenix");
    const rangeEnd = new Date(rangeStart.getTime() + 14 * 24 * 60 * 60 * 1000);

    const pos = blockPosition(
      {
        startsAt: "2026-06-22T07:00:00.000Z",
        endsAt: "2026-06-23T06:59:00.000Z",
      },
      rangeStart.toISOString(),
      rangeEnd.toISOString()
    );

    expect(pos.leftPct).toBeCloseTo((11 / 14) * 100, 0);
    expect(pos.widthPct).toBeCloseTo((1 / 14) * 100, 0);
  });
});
