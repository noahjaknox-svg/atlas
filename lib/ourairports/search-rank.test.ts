import { describe, expect, it } from "vitest";
import { rankAirportSearchHits } from "@/lib/ourairports/search-rank";
import type { AirportSearchHit } from "@/lib/ourairports/types";

function hit(partial: Partial<AirportSearchHit> & Pick<AirportSearchHit, "ident" | "name">): AirportSearchHit {
  return {
    icao: partial.icao ?? partial.ident,
    iata: partial.iata ?? null,
    municipality: partial.municipality ?? null,
    isoCountry: partial.isoCountry ?? "US",
    type: partial.type ?? "small_airport",
    ...partial,
  };
}

describe("rankAirportSearchHits", () => {
  it("prioritizes exact US ICAO match over partial foreign matches", () => {
    const ranked = rankAirportSearchHits("ksdl", [
      hit({ ident: "ESNN", icao: "ESNN", name: "Sundsvall", isoCountry: "SE", type: "medium_airport" }),
      hit({ ident: "KSDL", icao: "KSDL", name: "Scottsdale Airport", municipality: "Scottsdale" }),
    ]);

    expect(ranked[0]!.ident).toBe("KSDL");
  });

  it("prioritizes US airports when scores are otherwise tied", () => {
    const ranked = rankAirportSearchHits("scottsdale", [
      hit({ ident: "XXXX", icao: "XXXX", name: "Scottsdale Field", isoCountry: "AU" }),
      hit({ ident: "KSDL", icao: "KSDL", name: "Scottsdale Airport", municipality: "Scottsdale" }),
    ]);

    expect(ranked[0]!.ident).toBe("KSDL");
  });
});
