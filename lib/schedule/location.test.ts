import { describe, expect, it } from "vitest";
import { inferLocationAt } from "@/lib/schedule/location";
import type { ScheduleEvent } from "@prisma/client";

describe("inferLocationAt parked events", () => {
  it("uses arrIcao for away-from-home when locationIcao is stale", () => {
    const away = {
      depIcao: "COE",
      arrIcao: "COE",
      locationIcao: "SDL",
      startsAt: new Date("2026-06-18T22:24:00.000Z"),
      endsAt: new Date("2026-06-21T18:00:00.000Z"),
    } as ScheduleEvent;

    expect(inferLocationAt([away], new Date("2026-06-19T16:00:00.000Z"), "SDL")).toBe(
      "COE"
    );
  });
});
