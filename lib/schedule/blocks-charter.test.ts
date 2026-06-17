import { describe, expect, it } from "vitest";
import { blocksCharterScheduling } from "@/lib/schedule/blocks-charter";
import type { ScheduleEvent } from "@prisma/client";

function event(partial: Partial<ScheduleEvent>): ScheduleEvent {
  return {
    id: "e1",
    sourceId: "s1",
    externalUid: "u1",
    externalTripCode: null,
    externalUrl: null,
    tailNumber: "N370EL",
    fleetAircraftId: null,
    depIcao: "COE",
    arrIcao: "COE",
    locationIcao: "COE",
    startsAt: new Date("2026-06-18T22:24:00.000Z"),
    endsAt: new Date("2026-06-21T18:00:00.000Z"),
    lastModifiedAt: null,
    clientLabel: null,
    paxCount: null,
    picName: null,
    sicName: null,
    cabinCrew: [],
    summaryRaw: "[N370EL] @ KCOE (COE - COE) - Aircraft away from home base",
    descriptionRaw: null,
    rawEventType: "other",
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

describe("blocksCharterScheduling", () => {
  it("does not block on away-from-home ground events", () => {
    expect(blocksCharterScheduling(event({}))).toBe(false);
  });

  it("blocks on owner flights", () => {
    expect(
      blocksCharterScheduling(
        event({
          depIcao: "SDL",
          arrIcao: "COE",
          summaryRaw: "[N370EL] DSKS1 (SDL - COE) - Owner flight",
          rawEventType: "owner",
        })
      )
    ).toBe(true);
  });

  it("blocks on No Crew ground days", () => {
    expect(
      blocksCharterScheduling(
        event({
          depIcao: "SDL",
          arrIcao: "SDL",
          summaryRaw: "[N698RS] No Crew (SDL - SDL) - Other",
          rawEventType: "other",
        })
      )
    ).toBe(true);
  });
});
