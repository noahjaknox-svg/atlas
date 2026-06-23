import { resolveHeroCloudVideoUrl } from "@/lib/portal-constants";
import type { PortalContentData } from "@/lib/portal-constants";

export type PortalBranding = {
  heroCloudImageUrl: string;
  heroCloudVideoUrl: string;
  logoUrl: string | null;
};

/** Global branding assets always read from live portal_content, not frozen snapshots. */
export function resolveLivePortalBranding(
  content: Pick<PortalContentData, "heroCloudImageUrl" | "heroCloudVideoUrl" | "logoUrl">
): PortalBranding {
  return {
    heroCloudImageUrl: content.heroCloudImageUrl,
    heroCloudVideoUrl: resolveHeroCloudVideoUrl(content.heroCloudVideoUrl),
    logoUrl: content.logoUrl,
  };
}
