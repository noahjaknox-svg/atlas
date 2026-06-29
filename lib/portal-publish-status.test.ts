import { describe, expect, it } from "vitest";
import { computePortalPublishStatus } from "./portal-publish-status";

describe("computePortalPublishStatus", () => {
  it("returns neverPublished when no snapshot exists", () => {
    expect(
      computePortalPublishStatus({
        lastPublishedAt: null,
        hasPortal: true,
        changeTimestamps: [new Date()],
      })
    ).toBe("neverPublished");
  });

  it("returns unpublishedChanges when draft is newer than publish", () => {
    const published = new Date("2026-01-01T12:00:00Z");
    const edited = new Date("2026-01-02T12:00:00Z");
    expect(
      computePortalPublishStatus({
        lastPublishedAt: published,
        hasPortal: true,
        changeTimestamps: [edited],
      })
    ).toBe("unpublishedChanges");
  });

  it("returns published when draft matches publish time", () => {
    const published = new Date("2026-01-01T12:00:00Z");
    expect(
      computePortalPublishStatus({
        lastPublishedAt: published,
        hasPortal: true,
        changeTimestamps: [published],
      })
    ).toBe("published");
  });
});
