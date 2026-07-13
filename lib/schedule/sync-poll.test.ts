import { describe, expect, it } from "vitest";
import { shouldRunScheduledSync, normalizePollIntervalMinutes } from "@/lib/schedule/sync-poll";

describe("shouldRunScheduledSync", () => {
  it("skips when Never (0)", () => {
    expect(
      shouldRunScheduledSync({
        enabled: true,
        pollIntervalMinutes: 0,
        lastSyncedAt: null,
      })
    ).toEqual({ run: false, reason: "never" });
  });

  it("skips when disabled", () => {
    expect(
      shouldRunScheduledSync({
        enabled: false,
        pollIntervalMinutes: 60,
        lastSyncedAt: null,
      })
    ).toEqual({ run: false, reason: "disabled" });
  });

  it("runs hourly when never synced", () => {
    expect(
      shouldRunScheduledSync({
        enabled: true,
        pollIntervalMinutes: 60,
        lastSyncedAt: null,
      })
    ).toEqual({ run: true });
  });

  it("skips hourly when last sync was recent", () => {
    expect(
      shouldRunScheduledSync({
        enabled: true,
        pollIntervalMinutes: 60,
        lastSyncedAt: new Date(Date.now() - 10 * 60_000),
      })
    ).toEqual({ run: false, reason: "not_due" });
  });

  it("runs daily when last sync was over a day ago", () => {
    expect(
      shouldRunScheduledSync({
        enabled: true,
        pollIntervalMinutes: 1440,
        lastSyncedAt: new Date(Date.now() - 25 * 60 * 60_000),
      })
    ).toEqual({ run: true });
  });

  it("normalizes odd poll values to Never", () => {
    expect(normalizePollIntervalMinutes(10)).toBe(0);
    expect(normalizePollIntervalMinutes(60)).toBe(60);
    expect(normalizePollIntervalMinutes(1440)).toBe(1440);
  });
});
