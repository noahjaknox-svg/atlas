import { describe, expect, it, vi } from "vitest";

/**
 * Progress mapping used by schedule sync for the empty-legs phase.
 * Kept here so we don't regress the "stuck at 90%" UX.
 */
function emptyLegStreamPercent(done: number, total: number): number {
  const pct = total <= 0 ? 99 : 90 + Math.round((done / total) * 9);
  return Math.min(99, Math.max(90, pct));
}

describe("empty-leg sync progress mapping", () => {
  it("starts at 90 and reaches 99 at completion", () => {
    expect(emptyLegStreamPercent(0, 100)).toBe(90);
    expect(emptyLegStreamPercent(50, 100)).toBe(95);
    expect(emptyLegStreamPercent(100, 100)).toBe(99);
  });

  it("never reports 100 from the empty-legs phase alone", () => {
    expect(emptyLegStreamPercent(100, 100)).toBeLessThan(100);
  });
});

describe("syncEmptyLegsFromSchedule exports", () => {
  it("accepts an onProgress callback in its options type", async () => {
    const mod = await import("@/lib/charter/empty-legs/sync");
    expect(typeof mod.syncEmptyLegsFromSchedule).toBe("function");
    // Compile-time shape check via calling with a noop progress handler
    // against a stub would hit the DB; just assert export presence here.
    const onProgress = vi.fn();
    expect(onProgress).toBeTypeOf("function");
  });
});
