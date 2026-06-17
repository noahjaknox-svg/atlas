import { describe, expect, it } from "vitest";
import type { ScheduleEvent } from "@prisma/client";
import { buildScheduleTimeline, blockPosition } from "@/lib/schedule/build-timeline";
import type { AvailabilityWindow } from "@/lib/schedule/types";
import { startOfZonedDay } from "@/lib/schedule/zoned-time";

const GRID_TZ = "America/Phoenix";
const rangeStart = startOfZonedDay(new Date("2026-06-11T00:00:00Z"), GRID_TZ);
const rangeEnd = new Date(rangeStart.getTime() + 14 * 24 * 60 * 60 * 1000);

const timelineBase = {
  rangeStart,
  rangeEnd,
  gridTimezone: GRID_TZ,
  timezoneByIcao: { SDL: "America/Phoenix" },
};

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
  it("classifies a repo leg as an empty leg and condenses the route", () => {
    const timeline = buildScheduleTimeline({
      ...timelineBase,
      tails: [{ tailNumber: "N365AV", homeBase: "SDL", typeCode: "B300" }],
      events: [makeEvent({ id: "e1" })],
      windows: [],
    });

    const block = timeline.rows[0]!.blocks[0]!;
    expect(block.kind).toBe("empty_leg");
    expect(block.routeLabel).toBe("SDL → COE");
    expect(block.atlasNote).toContain("inbound charter");
  });

  it("classifies an occupied charter flight as unavailable", () => {
    const timeline = buildScheduleTimeline({
      ...timelineBase,
      tails: [{ tailNumber: "N365AV", homeBase: "SDL", typeCode: "B300" }],
      events: [
        makeEvent({
          id: "charter",
          rawEventType: "charter",
          availabilityClass: "hard_block",
          paxCount: 4,
          depIcao: "SDL",
          arrIcao: "LAS",
        }),
      ],
      windows: [],
    });

    const block = timeline.rows[0]!.blocks[0]!;
    expect(block.kind).toBe("unavailable");
    expect(block.routeLabel).toBe("SDL → LAS");
  });

  it("marks idle away-from-base as available with its location", () => {
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
      ...timelineBase,
      tails: [{ tailNumber: "N365AV", homeBase: "SDL", typeCode: "B300" }],
      events: [],
      windows,
      timezoneByIcao: { SDL: "America/Phoenix", COE: "America/Los_Angeles" },
    });

    const block = timeline.rows[0]!.blocks[0]!;
    expect(block.kind).toBe("available");
    expect(block.routeLabel).toBe("COE");
    expect(block.startAirport).toBe("COE");
    expect(block.endAirport).toBe("COE");
    expect(block.awayFromBase).toBe(true);
  });

  it("renders soft holds as notes, not lane blocks", () => {
    const timeline = buildScheduleTimeline({
      ...timelineBase,
      tails: [{ tailNumber: "N365AV", homeBase: "SDL", typeCode: "B300" }],
      events: [
        makeEvent({
          id: "hold",
          isHold: true,
          availabilityClass: "soft_hold",
          clientLabel: "Acme",
        }),
      ],
      windows: [],
    });

    const row = timeline.rows[0]!;
    expect(row.blocks).toHaveLength(0);
    expect(row.notes).toHaveLength(1);
    expect(row.notes[0]!.label).toContain("Acme");
  });

  it("treats JetInsight Hold Pine Canyon summaries as soft-hold notes", () => {
    const timeline = buildScheduleTimeline({
      ...timelineBase,
      tails: [{ tailNumber: "N1213P", homeBase: "SDL", typeCode: "B300" }],
      events: [
        makeEvent({
          id: "pine",
          tailNumber: "N1213P",
          isHold: false,
          availabilityClass: "hard_block",
          clientLabel: "Pine Canyon",
          summaryRaw: "[N1213P] Hold Pine Canyon (SDL - SDL) - Hold",
          depIcao: "SDL",
          arrIcao: "SDL",
          locationIcao: "SDL",
          startsAt: new Date("2026-06-22T07:00:00.000Z"),
          endsAt: new Date("2026-06-23T06:59:00.000Z"),
        }),
      ],
      windows: [],
    });

    const row = timeline.rows[0]!;
    expect(row.blocks).toHaveLength(0);
    expect(row.notes).toHaveLength(1);
    expect(row.notes[0]!.label).toContain("Pine Canyon");
  });

  it("produces a non-overlapping lane when a hard block sits inside availability", () => {
    const windows: AvailabilityWindow[] = [
      {
        id: "w1",
        tailNumber: "N365AV",
        locationIcao: "SDL",
        startsAt: new Date("2026-06-12T00:00:00Z"),
        endsAt: new Date("2026-06-16T00:00:00Z"),
        fleetAircraftId: null,
      },
    ];

    const timeline = buildScheduleTimeline({
      ...timelineBase,
      tails: [{ tailNumber: "N365AV", homeBase: "SDL", typeCode: "B300" }],
      events: [
        makeEvent({
          id: "mx",
          rawEventType: "maintenance",
          availabilityClass: "hard_block",
          depIcao: "SDL",
          arrIcao: "SDL",
          locationIcao: "SDL",
          startsAt: new Date("2026-06-13T00:00:00Z"),
          endsAt: new Date("2026-06-14T00:00:00Z"),
        }),
      ],
      windows,
    });

    const blocks = timeline.rows[0]!.blocks;
    // available | unavailable | available — and no two blocks overlap in time
    expect(blocks.map((b) => b.kind)).toEqual([
      "available",
      "unavailable",
      "available",
    ]);
    for (let i = 1; i < blocks.length; i++) {
      expect(new Date(blocks[i]!.startsAt).getTime()).toBeGreaterThanOrEqual(
        new Date(blocks[i - 1]!.endsAt).getTime()
      );
    }
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
