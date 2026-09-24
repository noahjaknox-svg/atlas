import { describe, expect, it, vi } from "vitest";
import {
  fetchAwcAirports,
  parseAwcAirport,
  parseFrequencies,
  parseMagneticVariation,
  AWC_USER_AGENT,
  type AwcAirportRaw,
} from "@/lib/awc/airport";
import { applyAwcNavData } from "@/lib/awc/overlay";
import type { CachedAirportNav } from "@/lib/awc/nav-data";
import type { AirportReferenceWire } from "@/lib/ourairports/types";

// Verbatim shape of AWC /api/data/airport?ids=KSDL&format=json
const KSDL_RAW: AwcAirportRaw = {
  icaoId: "KSDL",
  iataId: "SCF",
  faaId: "SDL",
  name: "SCOTTSDALE/SCOTTSDALE ",
  state: "AZ",
  country: "US",
  source: "FAA",
  lat: 33.6229,
  lon: -111.9105,
  elev: 460,
  magdec: "12E",
  tower: "T",
  beacon: "B",
  freqs: "ATIS,118.6;LCL/P,119.9",
  runways: [{ id: "03/21", dimension: "8249x100", surface: "A", alignment: 44 }],
};

describe("parseAwcAirport", () => {
  it("converts AWC's meter elevation to feet and parses runways/frequencies", () => {
    const nav = parseAwcAirport(KSDL_RAW)!;
    // 460 m = 1,509 ft (Scottsdale is 1,510 ft) — AWC elev is meters, not feet.
    expect(nav.elevationFt).toBe(1509);
    expect(nav).toMatchObject({ icao: "KSDL", faaId: "SDL", hasTower: true, hasBeacon: true });
    expect(nav.magneticVariationDeg).toBe(12);
    expect(nav.frequencies).toEqual([
      { type: "ATIS", frequencyMhz: 118.6 },
      { type: "LCL/P", frequencyMhz: 119.9 },
    ]);
    expect(nav.runways[0]).toMatchObject({
      leIdent: "03",
      heIdent: "21",
      lengthFt: 8249,
      widthFt: 100,
      surface: "Asphalt",
      leHeadingDegT: 44,
      heHeadingDegT: 224,
      isHelipad: false,
    });
  });

  it("handles untowered fields, helipads, no frequencies and unknown surface codes", () => {
    const nav = parseAwcAirport({
      icaoId: "KSEZ",
      tower: null,
      freqs: "-",
      runways: [
        { id: "H1", dimension: "50x50", surface: "C", alignment: null },
        { id: "05/23", dimension: "3000x60", surface: "Q", alignment: 50 },
      ],
    })!;
    expect(nav.hasTower).toBe(false);
    expect(nav.frequencies).toEqual([]);
    expect(nav.runways[0]).toMatchObject({ id: "H1", isHelipad: true, heIdent: null, leHeadingDegT: null });
    // Unverified codes stay as the raw code rather than a guessed label.
    expect(nav.runways[1]!.surface).toBe("Q");
  });

  it("rejects entries without an ICAO id", () => {
    expect(parseAwcAirport({ icaoId: "" })).toBeNull();
  });
});

describe("parseMagneticVariation / parseFrequencies", () => {
  it("reads east as positive, west as negative, and a bare zero", () => {
    expect(parseMagneticVariation("12E")).toBe(12);
    expect(parseMagneticVariation("08W")).toBe(-8);
    expect(parseMagneticVariation(0)).toBe(0);
    expect(parseMagneticVariation("junk")).toBeNull();
  });
  it("parses repeated frequency types", () => {
    expect(parseFrequencies("D-ATIS,114.2;LCL/P,119.5;D-ATIS,132.85")).toHaveLength(3);
  });
});

describe("fetchAwcAirports", () => {
  it("batches ids, sends our User-Agent, and treats 204 as no data", async () => {
    const calls: Array<{ url: string; ua: string | null }> = [];
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, ua: new Headers(init?.headers).get("User-Agent") });
      if (url.includes("KXXX")) return new Response(null, { status: 204 });
      return new Response(JSON.stringify([KSDL_RAW]), { status: 200 });
    }) as unknown as typeof fetch;

    const ids = Array.from({ length: 150 }, (_, i) => `K${String(i).padStart(3, "0")}`);
    const res = await fetchAwcAirports([...ids, "ksdl"], { fetchImpl });
    expect(calls).toHaveLength(2); // 151 ids → 100 + 51
    expect(calls.every((c) => c.ua === AWC_USER_AGENT)).toBe(true);
    // Never leaks personal data (e.g. an email) in the User-Agent.
    expect(AWC_USER_AGENT).not.toMatch(/@/);
    expect(res.get("KSDL")?.elevationFt).toBe(1509);

    const empty = await fetchAwcAirports(["KXXX"], { fetchImpl });
    expect(empty.size).toBe(0);
  });

  it("marks rate limiting and server errors as retriable", async () => {
    const fetchImpl = (async () => new Response("", { status: 429 })) as unknown as typeof fetch;
    await expect(fetchAwcAirports(["KSDL"], { fetchImpl })).rejects.toMatchObject({
      status: 429,
      retriable: true,
    });
  });
});

function wire(overrides: Partial<AirportReferenceWire> = {}): AirportReferenceWire {
  return {
    icao: "KSDL",
    ident: "KSDL",
    iata: "SCF",
    name: "Scottsdale Airport",
    type: "medium_airport",
    latitudeDeg: 33.62,
    longitudeDeg: -111.91,
    elevationFt: 1510,
    continent: "NA",
    isoCountry: "US",
    isoRegion: "US-AZ",
    municipality: "Scottsdale",
    scheduledService: false,
    gpsCode: "KSDL",
    localCode: "SDL",
    homeLink: null,
    wikipediaLink: null,
    keywords: null,
    longestRunwayFt: 8249,
    countryName: "United States",
    regionName: "Arizona",
    sourceVersion: "2026-09-01",
    runways: [
      {
        lengthFt: 8200,
        widthFt: 100,
        surface: "ASP",
        lighted: true,
        closed: false,
        leIdent: "3",
        heIdent: "21",
        leHeadingDegT: 43,
        heHeadingDegT: 223,
        gradientPctVerified: 0.4,
        gradientHighEndVerified: "21",
        gradientPctEstimated: 0.35,
      },
    ],
    frequencies: [{ type: "TWR", description: "Tower", frequencyMhz: 119.9 }],
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

const nav = (): CachedAirportNav => ({ ...parseAwcAirport(KSDL_RAW)!, fetchedAt: new Date("2026-09-20T00:00:00Z"), stale: false });

describe("applyAwcNavData", () => {
  it("prefers AWC for runway dimensions/surface/heading but keeps OurAirports gradients and flags", () => {
    const out = applyAwcNavData(wire(), nav());
    expect(out.runways).toHaveLength(1); // "3/21" matched "03/21", not duplicated
    expect(out.runways[0]).toMatchObject({
      lengthFt: 8249,
      surface: "Asphalt",
      leHeadingDegT: 44,
      lighted: true,
      gradientPctVerified: 0.4,
      gradientHighEndVerified: "21",
      source: "aviationweather.gov",
    });
    expect(out.elevationFt).toBe(1509);
    expect(out.frequencies.map((f) => f.type)).toEqual(["ATIS", "LCL/P"]);
    expect(out.nav).toMatchObject({ provider: "aviationweather.gov", hasTower: true, magneticVariationDeg: 12 });
  });

  it("maps headings correctly when the two sources list the runway ends in opposite order", () => {
    const flipped = wire({
      runways: [{ ...wire().runways[0]!, leIdent: "21", heIdent: "3", leHeadingDegT: 223, heHeadingDegT: 43 }],
    });
    const out = applyAwcNavData(flipped, nav());
    expect(out.runways[0]).toMatchObject({ leIdent: "21", leHeadingDegT: 224, heHeadingDegT: 44 });
  });

  it("adds runways only AWC lists, keeps OurAirports-only ones, and recomputes longest runway", () => {
    const n = nav();
    n.runways.push({ ...n.runways[0]!, id: "12/30", leIdent: "12", heIdent: "30", lengthFt: 9000 });
    const extra = wire({ runways: [...wire().runways, { ...wire().runways[0]!, leIdent: "17", heIdent: "35", lengthFt: 3000 }] });
    const out = applyAwcNavData(extra, n);
    expect(out.runways.map((r) => `${r.leIdent}/${r.heIdent}:${r.source}`)).toEqual([
      "3/21:aviationweather.gov",
      "17/35:ourairports",
      "12/30:aviationweather.gov",
    ]);
    expect(out.longestRunwayFt).toBe(9000);
  });

  it("falls back to OurAirports untouched when there's no nav data", () => {
    const w = wire();
    const out = applyAwcNavData(w, null);
    expect(out).toEqual({ ...w, nav: null });
  });
});

describe("getAirportNavDataMany (cache)", () => {
  type Row = Record<string, unknown> & { icao: string; fetchedAt: Date; found: boolean };
  function fakeDb(seed: Row[] = []) {
    const rows = new Map(seed.map((r) => [r.icao, r]));
    return {
      rows,
      db: {
        airportNavData: {
          findMany: async ({ where }: { where: { icao: { in: string[] } } }) =>
            where.icao.in.map((c) => rows.get(c)).filter(Boolean),
          upsert: async ({ create, where }: { create: Row; where: { icao: string } }) => {
            rows.set(where.icao, create);
            return create;
          },
        },
      } as never,
    };
  }
  const okFetch = (() => {
    const f = vi.fn(async () => new Response(JSON.stringify([KSDL_RAW]), { status: 200 }));
    return f as unknown as typeof fetch & typeof f;
  });
  const now = Date.parse("2026-09-24T00:00:00Z");
  const day = 24 * 3600 * 1000;

  it("fetches and caches a miss, then serves the cache without calling AWC", async () => {
    const { getAirportNavDataMany } = await import("@/lib/awc/nav-data");
    const { db, rows } = fakeDb();
    const f = okFetch();
    const first = await getAirportNavDataMany(db, ["ksdl"], { now, fetchImpl: f });
    expect(first.get("KSDL")?.elevationFt).toBe(1509);
    expect(rows.get("KSDL")?.found).toBe(true);
    const second = await getAirportNavDataMany(db, ["KSDL"], { now: now + day, fetchImpl: f });
    expect(second.get("KSDL")?.stale).toBe(false);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("remembers airports AWC doesn't know, and re-asks after a day", async () => {
    const { getAirportNavDataMany } = await import("@/lib/awc/nav-data");
    const { db, rows } = fakeDb();
    const empty = vi.fn(async () => new Response(null, { status: 204 })) as unknown as typeof fetch;
    expect((await getAirportNavDataMany(db, ["KXXX"], { now, fetchImpl: empty })).size).toBe(0);
    expect(rows.get("KXXX")?.found).toBe(false);
    await getAirportNavDataMany(db, ["KXXX"], { now: now + 3600_000, fetchImpl: empty });
    expect(empty).toHaveBeenCalledTimes(1); // negative cache still fresh
    await getAirportNavDataMany(db, ["KXXX"], { now: now + 2 * day, fetchImpl: empty });
    expect(empty).toHaveBeenCalledTimes(2);
  });

  it("serves the stale cached copy when AWC is down", async () => {
    const { getAirportNavDataMany } = await import("@/lib/awc/nav-data");
    const { db } = fakeDb();
    await getAirportNavDataMany(db, ["KSDL"], { now, fetchImpl: okFetch() });
    const down = (async () => {
      throw new TypeError("network down");
    }) as unknown as typeof fetch;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await getAirportNavDataMany(db, ["KSDL"], { now: now + 30 * day, fetchImpl: down });
    warn.mockRestore();
    expect(res.get("KSDL")).toMatchObject({ elevationFt: 1509, stale: true });
  });
});
