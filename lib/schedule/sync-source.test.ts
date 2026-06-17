import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  fetchAndSyncScheduleSource,
  normalizeIcsUrl,
} from "@/lib/schedule/sync-source";

const db = {} as PrismaClient;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("normalizeIcsUrl", () => {
  it("rewrites webcal:// to https://", () => {
    expect(normalizeIcsUrl("webcal://example.com/feed.ics")).toBe(
      "https://example.com/feed.ics"
    );
    expect(normalizeIcsUrl("WEBCAL://example.com/feed.ics")).toBe(
      "https://example.com/feed.ics"
    );
  });

  it("trims and leaves https URLs untouched", () => {
    expect(normalizeIcsUrl("  https://example.com/feed.ics  ")).toBe(
      "https://example.com/feed.ics"
    );
  });
});

describe("fetchAndSyncScheduleSource", () => {
  it("throws a descriptive error on a non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("Unauthorized", { status: 401, statusText: "Unauthorized" })
      )
    );

    await expect(
      fetchAndSyncScheduleSource(db, "src", "https://example.com/feed.ics")
    ).rejects.toThrow(/ICS fetch failed \(401/);
  });

  it("throws when the response is not a calendar (auth wall returning HTML)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<!doctype html><title>Login</title>", { status: 200 })
      )
    );

    await expect(
      fetchAndSyncScheduleSource(db, "src", "https://example.com/feed.ics")
    ).rejects.toThrow(/did not return a calendar/);
  });

  it("surfaces a clear error when the URL is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed"))
    );

    await expect(
      fetchAndSyncScheduleSource(db, "src", "https://example.com/feed.ics")
    ).rejects.toThrow(/Could not reach the ICS URL/);
  });
});
