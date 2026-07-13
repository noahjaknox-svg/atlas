import { describe, expect, it } from "vitest";
import {
  hasHardBlockOverlap,
  resolveEmptyLegAvailability,
} from "@/lib/charter/empty-legs/availability";
import type { ScheduleEvent } from "@prisma/client";

function event(partial: Partial<ScheduleEvent>): ScheduleEvent {
  return {
    id: "e1",
    sourceId: "s1",
    externalUid: "u1",
    externalTripCode: null,
    externalUrl: null,
    tailNumber: "N365AV",
    fleetAircraftId: null,
    depIcao: "SDL",
    arrIcao: "ASE",
    locationIcao: "SDL",
    startsAt: new Date("2026-06-01T12:00:00.000Z"),
    endsAt: new Date("2026-06-01T14:00:00.000Z"),
    lastModifiedAt: null,
    clientLabel: null,
    paxCount: null,
    picName: null,
    sicName: null,
    cabinCrew: [],
    summaryRaw: "[N365AV] Owner flight",
    descriptionRaw: null,
    rawEventType: "owner",
    isHold: false,
    isAdminBlock: false,
    availabilityClass: "hard_block",
    rawIcs: {},
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  } as ScheduleEvent;
}

describe("resolveEmptyLegAvailability", () => {
  it("honors force_available over calendar block", () => {
    expect(
      resolveEmptyLegAvailability({ forceState: "force_available", calendarBlocked: true })
    ).toBe("available");
  });

  it("honors force_unavailable", () => {
    expect(
      resolveEmptyLegAvailability({ forceState: "force_unavailable", calendarBlocked: false })
    ).toBe("unavailable");
  });

  it("uses calendar when no force", () => {
    expect(
      resolveEmptyLegAvailability({ forceState: null, calendarBlocked: true })
    ).toBe("unavailable");
    expect(
      resolveEmptyLegAvailability({ forceState: null, calendarBlocked: false })
    ).toBe("available");
  });
});

describe("hasHardBlockOverlap", () => {
  const window = {
    emptyLegEventId: "leg-event",
    tailNumber: "N365AV",
    startsAt: new Date("2026-06-01T12:00:00.000Z"),
    endsAt: new Date("2026-06-01T15:00:00.000Z"),
  };

  it("ignores the empty-leg event itself", () => {
    expect(
      hasHardBlockOverlap({
        ...window,
        events: [event({ id: "leg-event" })],
      })
    ).toBe(false);
  });

  it("detects overlapping hard block on same tail", () => {
    expect(
      hasHardBlockOverlap({
        ...window,
        events: [
          event({
            id: "other",
            startsAt: new Date("2026-06-01T14:00:00.000Z"),
            endsAt: new Date("2026-06-01T16:00:00.000Z"),
          }),
        ],
      })
    ).toBe(true);
  });

  it("ignores different tails", () => {
    expect(
      hasHardBlockOverlap({
        ...window,
        events: [event({ id: "other", tailNumber: "N999XX" })],
      })
    ).toBe(false);
  });

  it("ignores non-overlapping events", () => {
    expect(
      hasHardBlockOverlap({
        ...window,
        events: [
          event({
            id: "other",
            startsAt: new Date("2026-06-01T16:00:00.000Z"),
            endsAt: new Date("2026-06-01T18:00:00.000Z"),
          }),
        ],
      })
    ).toBe(false);
  });

  it("ignores deleted events", () => {
    expect(
      hasHardBlockOverlap({
        ...window,
        events: [event({ id: "other", deletedAt: new Date() })],
      })
    ).toBe(false);
  });

  it("ignores away-from-home soft blocks", () => {
    expect(
      hasHardBlockOverlap({
        ...window,
        events: [
          event({
            id: "other",
            summaryRaw: "[N365AV] @ KCOE (COE - COE) - Aircraft away from home base",
            depIcao: "COE",
            arrIcao: "COE",
          }),
        ],
      })
    ).toBe(false);
  });
});
