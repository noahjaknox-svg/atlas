import { describe, expect, it } from "vitest";
import { resolvePortalBranding } from "@/lib/portal-constants";

describe("resolvePortalBranding", () => {
  it("uses live portal content for cloud video and ignores snapshot branding", () => {
    const liveContent = {
      heroCloudImageUrl: "https://cdn.example/live-cloud.jpg",
      heroCloudVideoUrl: "https://cdn.example/live-cloud.mp4",
      logoUrl: "https://cdn.example/live-logo.png",
    };

    const snapshot = {
      heroCloudImageUrl: "https://cdn.example/snapshot-cloud.jpg",
      heroCloudVideoUrl: "https://cdn.example/snapshot-cloud.mp4",
      logoUrl: "https://cdn.example/snapshot-logo.png",
    };

    const branding = resolvePortalBranding(liveContent, snapshot);

    expect(branding.heroCloudImageUrl).toBe("https://cdn.example/live-cloud.jpg");
    expect(branding.heroCloudVideoUrl).toBe("https://cdn.example/live-cloud.mp4");
    expect(branding.logoUrl).toBe("https://cdn.example/live-logo.png");
  });

  it("does not fall back to snapshot cloud video when live content has a saved URL", () => {
    const branding = resolvePortalBranding(
      {
        heroCloudImageUrl: "https://cdn.example/new-cloud.jpg",
        heroCloudVideoUrl: "https://cdn.example/new-cloud.mp4",
        logoUrl: "https://cdn.example/new-logo.png",
      },
      {
        heroCloudVideoUrl: "https://cdn.example/old-snapshot.mp4",
      }
    );

    expect(branding.heroCloudVideoUrl).toBe("https://cdn.example/new-cloud.mp4");
    expect(branding.heroCloudVideoUrl).not.toBe("https://cdn.example/old-snapshot.mp4");
  });
});
