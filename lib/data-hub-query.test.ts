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
    const url = new URL("http://local/api/data/crew-rates?q=pic&aircraftId=abc&role=pic");
    expect(parseListQuery(url)).toEqual({
      q: "pic",
      aircraftId: "abc",
      role: "pic",
    });
  });
});

describe("buildDataHubQuery round-trip", () => {
  it("serializes and parses filters", () => {
    const params = buildDataHubQuery({
      q: "challenger",
      aircraftId: "uuid-1",
      role: "pic",
    });
    const parsed = parseDataHubFilters(params);
    expect(parsed.q).toBe("challenger");
    expect(parsed.aircraftId).toBe("uuid-1");
    expect(parsed.role).toBe("pic");
  });
});

describe("buildPrismaWhere", () => {
  it("builds crew rate filters", () => {
    const where = buildPrismaWhere("crew-rates", {
      aircraftId: "master-1",
      role: "pic",
    });
    expect(where).toEqual({
      AND: [{ aircraftMasterId: "master-1" }, { role: "pic" }],
    });
  });

  it("builds hangar filters", () => {
    const where = buildPrismaWhere("hangar-costs", {
      aircraftId: "master-1",
      airportId: "airport-1",
      pricingMethod: "quoted",
    });
    expect(where).toEqual({
      AND: [
        { aircraftMasterId: "master-1" },
        { airportId: "airport-1" },
        { pricingMethod: "quoted" },
      ],
    });
  });

  it("includes text search for aircraft master", () => {
    const where = buildPrismaWhere("aircraft-master", { q: "G650" });
    expect(where).toHaveProperty("AND");
    const and = (where as { AND: unknown[] }).AND;
    expect(and.length).toBe(1);
  });

  it("returns empty object when no filters", () => {
    expect(buildPrismaWhere("crew-rates", {})).toEqual({});
  });
});

describe("hasListFilters", () => {
  it("detects active filters", () => {
    expect(hasListFilters({})).toBe(false);
    expect(hasListFilters({ role: "pic" })).toBe(true);
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
