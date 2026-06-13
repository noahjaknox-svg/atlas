import { describe, expect, it } from "vitest";
import type { ScheduleEvent } from "@prisma/client";
import { buildScheduleTimeline, blockPosition } from "@/lib/schedule/build-timeline";
import type { AvailabilityWindow } from "@/lib/schedule/types";

const rangeStart = new Date("2026-06-11T00:00:00Z");
const rangeEnd = new Date("2026-06-25T00:00:00Z");

function makeEvent(overrides: Partial<ScheduleEvent>): ScheduleEvent {
  const id = overrides.id ?? "e1";
  return {
    id,
    sourceId: "src",
    externalUid: id,
    externalTripCode: null,
    externalUrl: null,
    tailNumber: "N365AV",
    fleetAircraftId: null,
    depIcao: "SDL",
    arrIcao: "COE",
    locationIcao: "SDL",
    startsAt: new Date("2026-06-12T19:31:00Z"),
    endsAt: new Date("2026-06-12T21:55:00Z"),
    lastModifiedAt: null,
    clientLabel: "AvAir",
    paxCount: 0,
    picName: "Keys",
    sicName: "Muncy",
    cabinCrew: [],
    summaryRaw: "[N365AV] AvAir (SDL - COE) - Positioning flight",
    descriptionRaw: null,
    rawEventType: "positioning",
    isHold: false,
    isAdminBlock: false,
    availabilityClass: "repo_opportunity",
    rawIcs: {},
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ScheduleEvent;
}

describe("buildScheduleTimeline", () => {
  it("classifies repo leg as needs_to_sell", () => {
    const timeline = buildScheduleTimeline({
      rangeStart,
      rangeEnd,
      tails: [{ tailNumber: "N365AV", homeBase: "SDL", typeCode: "B300" }],
      events: [makeEvent({ id: "e1" })],
      windows: [],
      timezoneByIcao: { SDL: "America/Phoenix" },
    });

    const block = timeline.rows[0]!.blocks[0]!;
    expect(block.kind).toBe("needs_to_sell");
    expect(block.label).toContain("Repo");
    expect(block.atlasNote).toContain("inbound charter");
  });

  it("marks idle away-from-base as charter available", () => {
    const windows: AvailabilityWindow[] = [
      {
        id: "w1",
        tailNumber: "N365AV",
        locationIcao: "COE",
        startsAt: new Date("2026-06-12T22:00:00Z"),
        endsAt: new Date("2026-06-15T08:00:00Z"),
        fleetAircraftId: null,
      },
    ];

    const timeline = buildScheduleTimeline({
      rangeStart,
      rangeEnd,
      tails: [{ tailNumber: "N365AV", homeBase: "SDL", typeCode: "B300" }],
      events: [],
      windows,
      timezoneByIcao: { SDL: "America/Phoenix", COE: "America/Los_Angeles" },
    });

    const block = timeline.rows[0]!.blocks[0]!;
    expect(block.kind).toBe("available");
    expect(block.label).toContain("COE");
    expect(block.awayFromBase).toBe(true);
  });

  it("marks home-base idle as available", () => {
    const windows: AvailabilityWindow[] = [
      {
        id: "w2",
        tailNumber: "N365AV",
        locationIcao: "SDL",
        startsAt: new Date("2026-06-13T08:00:00Z"),
        endsAt: new Date("2026-06-13T18:00:00Z"),
        fleetAircraftId: null,
      },
    ];

    const timeline = buildScheduleTimeline({
      rangeStart,
      rangeEnd,
      tails: [{ tailNumber: "N365AV", homeBase: "SDL", typeCode: "B300" }],
      events: [],
      windows,
      timezoneByIcao: { SDL: "America/Phoenix", COE: "America/Los_Angeles" },
    });

    const block = timeline.rows[0]!.blocks[0]!;
    expect(block.kind).toBe("available");
    expect(block.label).toContain("Available");
  });
});

describe("blockPosition", () => {
  it("computes percentage placement within range", () => {
    const pos = blockPosition(
      {
        startsAt: "2026-06-12T12:00:00Z",
        endsAt: "2026-06-12T18:00:00Z",
      },
      rangeStart.toISOString(),
      rangeEnd.toISOString()
    );
    expect(pos.leftPct).toBeGreaterThan(0);
    expect(pos.widthPct).toBeGreaterThan(0);
    expect(pos.leftPct + pos.widthPct).toBeLessThan(100);
  });
});
