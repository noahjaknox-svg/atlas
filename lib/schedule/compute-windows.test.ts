import { describe, expect, it } from "vitest";
import type { ScheduleEvent } from "@prisma/client";
import { computeAvailabilityWindows } from "@/lib/schedule/compute-windows";

const rangeStart = new Date("2026-06-11T00:00:00Z");
const rangeEnd = new Date("2026-06-18T00:00:00Z");

function makeEvent(overrides: Partial<ScheduleEvent>): ScheduleEvent {
  const id = overrides.id ?? "e1";
  return {
    id,
    sourceId: "src",
    externalUid: id,
    externalTripCode: null,
    externalUrl: null,
    tailNumber: "N823HM",
    fleetAircraftId: null,
    depIcao: "SDL",
    arrIcao: "SDL",
    locationIcao: "SDL",
    startsAt: new Date("2026-06-12T10:00:00Z"),
    endsAt: new Date("2026-06-12T18:00:00Z"),
    lastModifiedAt: null,
    clientLabel: "Hold note",
    paxCount: 0,
    picName: null,
    sicName: null,
    cabinCrew: [],
    summaryRaw: "HOLD: [N823HM] Standby Crew (SDL - SDL) - Other",
    descriptionRaw: null,
    rawEventType: "other",
    isHold: true,
    isAdminBlock: false,
    availabilityClass: "soft_hold",
    rawIcs: {},
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ScheduleEvent;
}

describe("computeAvailabilityWindows", () => {
  const tail = { tailNumber: "N823HM", homeBase: "SDL", fleetAircraftId: null };

  it("shows full range available when no hard blocks", () => {
    const windows = computeAvailabilityWindows({
      rangeStart,
      rangeEnd,
      tails: [tail],
      events: [],
    });
    expect(windows.length).toBe(1);
    expect(windows[0]!.locationIcao).toBe("SDL");
    expect(windows[0]!.startsAt).toEqual(rangeStart);
    expect(windows[0]!.endsAt).toEqual(rangeEnd);
  });

  it("does not split availability on soft holds", () => {
    const windows = computeAvailabilityWindows({
      rangeStart,
      rangeEnd,
      tails: [tail],
      events: [makeEvent({ id: "hold1" })],
    });
    const totalMs = windows.reduce(
      (sum, w) => sum + (w.endsAt.getTime() - w.startsAt.getTime()),
      0
    );
    const rangeMs = rangeEnd.getTime() - rangeStart.getTime();
    expect(totalMs).toBeGreaterThan(rangeMs * 0.9);
  });

  it("splits availability around hard blocks only", () => {
    const windows = computeAvailabilityWindows({
      rangeStart,
      rangeEnd,
      tails: [tail],
      events: [
        makeEvent({
          id: "charter1",
          isHold: false,
          availabilityClass: "hard_block",
          rawEventType: "charter",
          summaryRaw: "[N823HM] Client (SDL - TRM) - Charter flight",
          startsAt: new Date("2026-06-13T14:00:00Z"),
          endsAt: new Date("2026-06-13T20:00:00Z"),
        }),
      ],
    });
    expect(windows.length).toBeGreaterThanOrEqual(2);
    const hasBefore = windows.some((w) => w.endsAt <= new Date("2026-06-13T14:00:00Z"));
    const hasAfter = windows.some((w) => w.startsAt >= new Date("2026-06-13T20:00:00Z"));
    expect(hasBefore).toBe(true);
    expect(hasAfter).toBe(true);
  });
});
