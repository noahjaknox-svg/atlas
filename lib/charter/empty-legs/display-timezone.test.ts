import { describe, expect, it } from "vitest";
import {
  isEmptyLegTimezoneConfident,
  resolveEmptyLegDepartureTimezone,
} from "@/lib/charter/empty-legs/display-timezone";
import {
  formatEmptyLegDateTime,
  formatEmptyLegDepartureLabel,
  formatEmptyLegDepartureLabelPublic,
} from "@/lib/schedule/airport-timezone-format";

describe("empty-leg departure-airport local time confidence", () => {
  it("resolves TEB via fallback map with medium confidence", () => {
    const tz = resolveEmptyLegDepartureTimezone("KTEB");
    expect(tz.timeZone).toBe("America/New_York");
    expect(tz.confidence).toBe("medium");
    expect(tz.source).toBe("fallback_map");
    expect(isEmptyLegTimezoneConfident(tz)).toBe(true);
  });

  it("prefers overrides over geo and fallback", () => {
    const tz = resolveEmptyLegDepartureTimezone("KTEB", {
      overridesByIcao: { TEB: "America/Chicago" },
      geoByIcao: { TEB: "America/New_York" },
    });
    expect(tz).toEqual({
      timeZone: "America/Chicago",
      confidence: "high",
      source: "override",
    });
  });

  it("prefers geo-tz over fallback map", () => {
    const tz = resolveEmptyLegDepartureTimezone("KXYZ", {
      geoByIcao: { KXYZ: "America/Denver" },
    });
    expect(tz).toEqual({
      timeZone: "America/Denver",
      confidence: "high",
      source: "geo_tz",
    });
  });

  it("returns unknown for airports with no resolution (no silent UTC)", () => {
    const tz = resolveEmptyLegDepartureTimezone("ZZZZ");
    expect(tz.timeZone).toBeNull();
    expect(tz.confidence).toBe("unknown");
    expect(tz.source).toBe("none");
    expect(isEmptyLegTimezoneConfident(tz)).toBe(false);
  });

  it("formats TEB Zulu as Eastern wall clock in 24h for inventory", () => {
    const iso = "2026-07-10T23:21:00.000Z";
    const { timeZone } = resolveEmptyLegDepartureTimezone("KTEB");
    const label = formatEmptyLegDepartureLabel(iso, timeZone);
    expect(label).toContain("19:21");
    expect(label).toMatch(/EDT|EST/);
    expect(label).not.toContain("23:21");
    expect(label).not.toMatch(/\b(AM|PM|GMT|UTC)\b/);
  });

  it("formats TEB Zulu as Eastern AM/PM for public lists", () => {
    const iso = "2026-07-10T23:21:00.000Z";
    const { timeZone } = resolveEmptyLegDepartureTimezone("KTEB");
    const label = formatEmptyLegDepartureLabelPublic(iso, timeZone);
    expect(label).toMatch(/7:21\s*PM/i);
    expect(label).toMatch(/EDT|EST/);
    expect(label).not.toContain("23:21");
    expect(label).not.toMatch(/\bGMT\b|\bUTC\b/);
  });

  it("never shows GMT for unknown airports on inventory or public", () => {
    const iso = "2026-07-10T23:21:00.000Z";
    const inventory = formatEmptyLegDepartureLabel(iso, null);
    const pub = formatEmptyLegDepartureLabelPublic(iso, null);
    expect(inventory).toContain("timezone unknown");
    expect(pub).toContain("Local time pending");
    expect(inventory).not.toMatch(/\bGMT\b|\bUTC\b|23:21/);
    expect(pub).not.toMatch(/\bGMT\b|\bUTC\b|23:21|11:21/);
  });

  it("formats DEN departure in Mountain time, not Zulu", () => {
    const iso = "2026-07-10T23:21:00.000Z";
    const { timeZone } = resolveEmptyLegDepartureTimezone("KDEN");
    const inventory = formatEmptyLegDateTime(iso, timeZone!, { hour12: false });
    expect(inventory).toContain("17:21");
    expect(inventory).not.toContain("23:21");
  });

  it("formats SDL departure in Phoenix time (no DST)", () => {
    const iso = "2026-07-12T23:00:00.000Z";
    const { timeZone } = resolveEmptyLegDepartureTimezone("KSDL");
    expect(timeZone).toBe("America/Phoenix");
    const inventory = formatEmptyLegDateTime(iso, timeZone!, { hour12: false });
    expect(inventory).toContain("16:00");
    expect(inventory).not.toContain("23:00");
  });
});

/**
 * JetInsight Local Time acceptance checklist (manual):
 * 1. Pick a TEB / APA / SNA empty leg in inventory.
 * 2. Open JetInsight trip Local Time panel/photo.
 * 3. Confirm Atlas inventory 24h local face matches that clock.
 * 4. Confirm public embed shows the same instant in AM/PM.
 * 5. For any “Needs timezone” row, set an airport override from detail and re-check.
 */
