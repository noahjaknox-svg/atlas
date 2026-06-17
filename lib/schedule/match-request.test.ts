import { describe, expect, it } from "vitest";
import { parseCharterEmail } from "@/lib/schedule/parse-email";
import { matchCharterRequest } from "@/lib/schedule/match-request";
import type { ScheduleEvent } from "@prisma/client";

describe("parseCharterEmail", () => {
  it("extracts route, pax, and date from email body", () => {
    const r = parseCharterEmail(
      "Charter request - Acme Corp",
      "Need quote for SDL to COE on 6/15/2026 for 6 pax. Thanks!"
    );
    expect(r.requestedDepIcao).toBe("SDL");
    expect(r.requestedArrIcao).toBe("COE");
    expect(r.paxCount).toBe(6);
    expect(r.requestedDepartAt).not.toBeNull();
    expect(r.parseConfidence).toBeGreaterThan(0.5);
  });
});

describe("matchCharterRequest", () => {
  const baseEvent = (overrides: Partial<ScheduleEvent>): ScheduleEvent =>
    ({
      id: "evt-1",
      sourceId: "src",
      externalUid: "uid",
      externalTripCode: null,
      externalUrl: null,
      tailNumber: "N365AV",
      fleetAircraftId: null,
      depIcao: "SDL",
      arrIcao: "COE",
      locationIcao: "SDL",
      startsAt: new Date("2026-06-09T19:31:00Z"),
      endsAt: new Date("2026-06-09T21:55:00Z"),
      lastModifiedAt: null,
      clientLabel: "AvAir",
      paxCount: 0,
      picName: null,
      sicName: null,
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
    }) as ScheduleEvent;

  it("boosts tail with aligning repo leg", () => {
    const events = [
      baseEvent({}),
      baseEvent({
        id: "evt-2",
        tailNumber: "N951NB",
        depIcao: "IWA",
        arrIcao: "COE",
        availabilityClass: "hard_block",
        rawEventType: "owner",
        startsAt: new Date("2026-06-09T16:30:00Z"),
        endsAt: new Date("2026-06-09T19:00:00Z"),
        summaryRaw: "Owner",
      }),
    ];

    const matches = matchCharterRequest(
      {
        requestedDepIcao: "COE",
        requestedArrIcao: "SDL",
        requestedDepartAt: new Date("2026-06-09T22:00:00Z"),
        paxCount: 4,
      },
      events,
      [
        { tailNumber: "N365AV", id: "fleet-1", homeBase: "SDL" },
        { tailNumber: "N951NB", id: "fleet-2", homeBase: "SDL" },
      ]
    );

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]!.tailNumber).toBe("N365AV");
    expect(matches[0]!.reasoning.legs[0]!.repoBoost).toBe(true);
  });
});
