import { describe, expect, it } from "vitest";
import { resolveLivePortalBranding } from "@/lib/client-portal-branding";
import { DEFAULT_CLOUD_VIDEO, resolveHeroCloudVideoUrl } from "@/lib/portal-constants";

describe("resolveLivePortalBranding", () => {
  it("uses live portal content and ignores stale snapshot branding", () => {
    const liveContent = {
      heroCloudImageUrl: "https://cdn.example/live-cloud.jpg",
      heroCloudVideoUrl: "https://cdn.example/live-cloud.mp4",
      logoUrl: "https://cdn.example/live-logo.png",
    };

    const branding = resolveLivePortalBranding(liveContent);

    expect(branding.heroCloudImageUrl).toBe("https://cdn.example/live-cloud.jpg");
    expect(branding.heroCloudVideoUrl).toBe("https://cdn.example/live-cloud.mp4");
    expect(branding.logoUrl).toBe("https://cdn.example/live-logo.png");
  });

  it("does not prefer snapshot branding values over live content", () => {
    const snapshotBranding = {
      heroCloudImageUrl: "https://cdn.example/snapshot-cloud.jpg",
      heroCloudVideoUrl: "https://cdn.example/snapshot-cloud.mp4",
      logoUrl: "https://cdn.example/snapshot-logo.png",
    };

    const liveContent = {
      heroCloudImageUrl: "https://cdn.example/new-cloud.jpg",
      heroCloudVideoUrl: "https://cdn.example/new-cloud.mp4",
      logoUrl: "https://cdn.example/new-logo.png",
    };

    const branding = resolveLivePortalBranding(liveContent);

    expect(branding.heroCloudImageUrl).not.toBe(snapshotBranding.heroCloudImageUrl);
    expect(branding.heroCloudVideoUrl).not.toBe(snapshotBranding.heroCloudVideoUrl);
    expect(branding.logoUrl).not.toBe(snapshotBranding.logoUrl);
  });
});

describe("resolveHeroCloudVideoUrl", () => {
  it("falls back to the bundled default path when null", () => {
    expect(resolveHeroCloudVideoUrl(null)).toBe(DEFAULT_CLOUD_VIDEO);
  });

  it("returns the provided URL when set", () => {
    expect(resolveHeroCloudVideoUrl("https://cdn.example/custom.mp4")).toBe(
      "https://cdn.example/custom.mp4"
    );
  });
});
