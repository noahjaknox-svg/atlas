import { describe, expect, it } from "vitest";
import { compareAirportsUsFirst } from "@/lib/ourairports/us-first-list";
import type { AirportReference } from "@prisma/client";

function row(partial: Partial<AirportReference> & Pick<AirportReference, "ident">): AirportReference {
  return {
    id: partial.id ?? partial.ident,
    ourairportsId: partial.ourairportsId ?? 1,
    ident: partial.ident,
    icao: partial.icao ?? partial.ident,
    iata: partial.iata ?? null,
    airportType: partial.airportType ?? "small_airport",
    name: partial.name ?? partial.ident,
    latitudeDeg: partial.latitudeDeg ?? null,
    longitudeDeg: partial.longitudeDeg ?? null,
    elevationFt: partial.elevationFt ?? null,
    continent: partial.continent ?? null,
    isoCountry: partial.isoCountry ?? "US",
    isoRegion: partial.isoRegion ?? null,
    municipality: partial.municipality ?? null,
    scheduledService: partial.scheduledService ?? false,
    gpsCode: partial.gpsCode ?? null,
    localCode: partial.localCode ?? null,
    homeLink: partial.homeLink ?? null,
    wikipediaLink: partial.wikipediaLink ?? null,
    keywords: partial.keywords ?? null,
    longestRunwayFt: partial.longestRunwayFt ?? null,
    sourceVersion: partial.sourceVersion ?? null,
    createdAt: partial.createdAt ?? new Date(),
    updatedAt: partial.updatedAt ?? new Date(),
  };
}

describe("compareAirportsUsFirst", () => {
  it("sorts US airports before non-US", () => {
    const us = row({ ident: "KZZZ", isoCountry: "US" });
    const ca = row({ ident: "CYYZ", isoCountry: "CA" });
    expect(compareAirportsUsFirst(us, ca)).toBeLessThan(0);
    expect(compareAirportsUsFirst(ca, us)).toBeGreaterThan(0);
  });

  it("sorts by ident within the same country group", () => {
    const a = row({ ident: "KAAA", isoCountry: "US" });
    const b = row({ ident: "KBBB", isoCountry: "US" });
    expect(compareAirportsUsFirst(a, b)).toBeLessThan(0);
  });
});
