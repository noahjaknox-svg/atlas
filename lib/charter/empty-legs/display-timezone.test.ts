import { describe, expect, it } from "vitest";
import { EMPTY_LEG_DISPLAY_TIMEZONE } from "@/lib/charter/empty-legs/display-timezone";
import {
  formatEmptyLegDateTime,
  formatEmptyLegDepartureLabel,
} from "@/lib/schedule/airport-timezone-format";

describe("empty-leg fleet Local Time (America/Denver)", () => {
  it("uses America/Denver as the display timezone", () => {
    expect(EMPTY_LEG_DISPLAY_TIMEZONE).toBe("America/Denver");
  });

  it("formats DEN-TWF Zulu 23:21 as 17:21 MDT", () => {
    const iso = "2026-07-10T23:21:00.000Z";
    const label = formatEmptyLegDepartureLabel(iso, EMPTY_LEG_DISPLAY_TIMEZONE);
    expect(label).toContain("17:21");
    expect(label).toMatch(/MDT|MST/);
    expect(label).not.toContain("23:21");
  });

  it("formats SDL-PHX Zulu 23:00 as 17:00 MDT", () => {
    const iso = "2026-07-12T23:00:00.000Z";
    const label = formatEmptyLegDateTime(iso, EMPTY_LEG_DISPLAY_TIMEZONE);
    expect(label).toContain("17:00");
    expect(label).not.toContain("23:00");
  });

  it("formats SDL-BFI Zulu 16:30 as 10:30 MDT", () => {
    const iso = "2026-07-13T16:30:00.000Z";
    const label = formatEmptyLegDateTime(iso, EMPTY_LEG_DISPLAY_TIMEZONE);
    expect(label).toContain("10:30");
    expect(label).not.toContain("16:30");
  });

  it("never shows UTC wall-clock when formatting with fleet local", () => {
    const iso = "2026-07-10T23:21:00.000Z";
    const utcFace = formatEmptyLegDateTime(iso, "UTC");
    const localFace = formatEmptyLegDateTime(iso, EMPTY_LEG_DISPLAY_TIMEZONE);
    expect(utcFace).toContain("23:21");
    expect(localFace).toContain("17:21");
    expect(localFace).not.toEqual(utcFace);
  });
});
