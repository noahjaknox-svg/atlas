import { describe, expect, it } from "vitest";
import { parseSummary } from "@/lib/schedule/parse-summary";
import { parseDescription } from "@/lib/schedule/parse-description";
import { classifyAvailability } from "@/lib/schedule/classify-availability";
import { parseIcsText } from "@/lib/schedule/parse-ics";
import { FIXTURE_EVENTS, wrapIcsCalendar } from "@/lib/schedule/fixtures";

describe("parseSummary", () => {
  it("parses owner flight", () => {
    const r = parseSummary("[N951NB] Earnhardt (IWA - COE) - Owner flight");
    expect(r.tailNumber).toBe("N951NB");
    expect(r.depIcao).toBe("IWA");
    expect(r.arrIcao).toBe("COE");
    expect(r.rawEventType).toBe("owner");
    expect(r.isHold).toBe(false);
  });

  it("parses HOLD prefix", () => {
    const r = parseSummary("HOLD: [N698RS] Very Minimal Crew (SDL - SDL) - Other");
    expect(r.isHold).toBe(true);
    expect(r.tailNumber).toBe("N698RS");
  });

  it("detects admin block phrases", () => {
    const r = parseSummary("[N1213P] DONT QUOTE PER CASEY (SDL - SDL) - Other");
    expect(r.isAdminBlock).toBe(true);
  });

  it("handles escaped commas in client name", () => {
    const r = parseSummary("[N365AV] Air Partner\\, LLC (SDL - SJC) - Positioning flight");
    expect(r.clientLabel).toBe("Air Partner, LLC");
    expect(r.rawEventType).toBe("positioning");
  });
});

describe("parseDescription", () => {
  it("extracts crew and pax", () => {
    const r = parseDescription(
      "Pax: 4\\nPIC: Trevor Blayne Clark\\nSIC: Ian Robert Crouse\\nCabin crew: Katelyn Mariah Sheffield\\n"
    );
    expect(r.paxCount).toBe(4);
    expect(r.picName).toBe("Trevor Blayne Clark");
    expect(r.sicName).toBe("Ian Robert Crouse");
    expect(r.cabinCrew).toEqual(["Katelyn Mariah Sheffield"]);
  });
});

describe("classifyAvailability", () => {
  it("classifies five user example types", () => {
    expect(
      classifyAvailability({
        isHold: false,
        isAdminBlock: false,
        rawEventType: "owner",
        summaryRaw: "[N951NB] Earnhardt (IWA - COE) - Owner flight",
        paxCount: 4,
      })
    ).toBe("hard_block");

    expect(
      classifyAvailability({
        isHold: false,
        isAdminBlock: false,
        rawEventType: "positioning",
        summaryRaw: "[N365AV] AvAir (SDL - COE) - Positioning flight",
        paxCount: 0,
      })
    ).toBe("repo_opportunity");

    expect(
      classifyAvailability({
        isHold: false,
        isAdminBlock: false,
        rawEventType: "charter",
        summaryRaw: "[N370EL] MPJets (OPF - AUS) - Charter flight",
        paxCount: 4,
      })
    ).toBe("hard_block");

    expect(
      classifyAvailability({
        isHold: false,
        isAdminBlock: true,
        rawEventType: "other",
        summaryRaw: "[N1213P] DONT QUOTE PER CASEY (SDL - SDL) - Other",
        paxCount: 0,
      })
    ).toBe("hard_block");

    expect(
      classifyAvailability({
        isHold: true,
        isAdminBlock: false,
        rawEventType: "other",
        summaryRaw: "HOLD: [N698RS] Very Minimal Crew (SDL - SDL) - Other",
        paxCount: 0,
      })
    ).toBe("soft_hold");
  });
});

describe("parseIcsText", () => {
  it("parses fixture calendar events end-to-end", async () => {
    const ics = wrapIcsCalendar(
      FIXTURE_EVENTS.ownerFlight,
      FIXTURE_EVENTS.positioningFlight,
      FIXTURE_EVENTS.charterFlight,
      FIXTURE_EVENTS.adminBlock,
      FIXTURE_EVENTS.softHold
    );
    const events = await parseIcsText(ics);
    expect(events).toHaveLength(5);

    const byUid = Object.fromEntries(events.map((e) => [e.externalUid, e]));

    expect(byUid.c7a32ac6993248f0aa1b6bc69e17e4ac?.availabilityClass).toBe("hard_block");
    expect(byUid.c7a32ac6993248f0aa1b6bc69e17e4ac?.externalTripCode).toBe("R7Y34T");

    expect(byUid.b3f62feba7374889854ee8d620e58153?.availabilityClass).toBe("repo_opportunity");
    expect(byUid.b3f62feba7374889854ee8d620e58153?.tailNumber).toBe("N365AV");

    expect(byUid["1ffa5c2cd50b40478623b553215f075a"]?.availabilityClass).toBe("hard_block");
    expect(byUid["1ffa5c2cd50b40478623b553215f075a"]?.paxCount).toBe(4);

    expect(byUid["69ad00539d754419a1d2ccf5193f7a67"]?.isAdminBlock).toBe(true);
    expect(byUid["69ad00539d754419a1d2ccf5193f7a67"]?.availabilityClass).toBe("hard_block");

    expect(byUid.f4367a981726426993ca92ada2537f3d?.isHold).toBe(true);
    expect(byUid.f4367a981726426993ca92ada2537f3d?.availabilityClass).toBe("soft_hold");
  });
});
