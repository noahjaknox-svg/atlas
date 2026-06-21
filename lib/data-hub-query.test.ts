import { describe, expect, it } from "vitest";
import {
  buildPrismaWhere,
  hasListFilters,
  listResponse,
  parseListQuery,
} from "@/lib/data-hub-query";
import { buildDataHubQuery, parseDataHubFilters } from "@/lib/data-hub-filters";

describe("parseListQuery", () => {
  it("reads filter params from URL", () => {
    const url = new URL("http://local/api/data/aircraft?q=challenger&category=super_midsize_jet");
    expect(parseListQuery(url)).toEqual({
      q: "challenger",
      category: "super_midsize_jet",
    });
  });

  it("reads airportIcao for FBO filtering", () => {
    const url = new URL("http://local/api/data/fbos?airportIcao=KSDL");
    expect(parseListQuery(url)).toEqual({ airportIcao: "KSDL" });
  });
});

describe("buildDataHubQuery round-trip", () => {
  it("serializes and parses filters", () => {
    const params = buildDataHubQuery({
      q: "challenger",
      airportIcao: "KSDL",
      category: "super_midsize_jet",
    });
    const parsed = parseDataHubFilters(params);
    expect(parsed.q).toBe("challenger");
    expect(parsed.airportIcao).toBe("KSDL");
    expect(parsed.category).toBe("super_midsize_jet");
  });
});

describe("buildPrismaWhere", () => {
  it("builds aircraft category + text search", () => {
    const where = buildPrismaWhere("aircraft", {
      q: "G650",
      category: "heavy_jet",
    });
    expect(where).toHaveProperty("AND");
    const and = (where as { AND: unknown[] }).AND;
    expect(and.length).toBe(2);
    expect(and[0]).toEqual({ aircraftCategory: "heavy_jet" });
  });

  it("builds fbo filters by airport ICAO", () => {
    const where = buildPrismaWhere("fbos", { airportIcao: "KSDL" });
    expect(where).toEqual({
      AND: [{ airportIcao: { equals: "KSDL", mode: "insensitive" } }],
    });
  });

  it("builds airport text search", () => {
    const where = buildPrismaWhere("airports", { q: "scottsdale" });
    expect(where).toHaveProperty("AND");
    const and = (where as { AND: unknown[] }).AND;
    expect(and.length).toBe(1);
  });

  it("returns empty object when no filters", () => {
    expect(buildPrismaWhere("aircraft", {})).toEqual({});
  });
});

describe("hasListFilters", () => {
  it("detects active filters", () => {
    expect(hasListFilters({})).toBe(false);
    expect(hasListFilters({ category: "heavy_jet" })).toBe(true);
  });
});

describe("listResponse", () => {
  it("wraps rows with counts", () => {
    expect(listResponse([{ id: "1" }], 10, 1)).toEqual({
      rows: [{ id: "1" }],
      total: 10,
      filtered: 1,
      page: 1,
      pageSize: 1,
      hasMore: false,
    });
  });
});
