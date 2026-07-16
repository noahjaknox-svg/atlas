import { describe, expect, it } from "vitest";
import { lookupFallbackTimezone } from "@/lib/schedule/airport-timezone-format";
import { resolveCrewAirportTimeZone } from "@/lib/schedule/airport-timezones";

describe("airport timezone fallbacks", () => {
  it("maps TWF to America/Boise in the fallback table", () => {
    expect(lookupFallbackTimezone("TWF")).toBe("America/Boise");
    expect(lookupFallbackTimezone("KTWF")).toBe("America/Boise");
  });
});

describe("resolveCrewAirportTimeZone", () => {
  it("prefers staff override over geo and fallback", () => {
    expect(
      resolveCrewAirportTimeZone({
        icao: "KSDL",
        lat: 33.62,
        lon: -111.91,
        override: "America/Denver",
      })
    ).toBe("America/Denver");
  });

  it("resolves PHX-area coords to America/Phoenix", () => {
    expect(
      resolveCrewAirportTimeZone({
        icao: "KSDL",
        lat: 33.6229,
        lon: -111.9105,
      })
    ).toBe("America/Phoenix");
  });

  it("uses static fallback when no coords", () => {
    expect(resolveCrewAirportTimeZone({ icao: "KTWF" })).toBe("America/Boise");
  });

  it("omits inventing UTC when unknown", () => {
    expect(
      resolveCrewAirportTimeZone({
        icao: "ZZZZ",
        lat: null,
        lon: null,
      })
    ).toBeNull();
  });
});
