import type { FleetShowcaseItem, PortalContentData } from "./portal-constants";
import { isSnapshotFleetFrozen } from "./experience-content";
import type { ProposalSnapshotPayload } from "./snapshot";

export type PortalPublishStatus =
  | "neverPublished"
  | "published"
  | "unpublishedChanges";

export function computePortalPublishStatus(input: {
  lastPublishedAt: Date | string | null | undefined;
  hasPortal: boolean;
  changeTimestamps: Array<Date | string | null | undefined>;
}): PortalPublishStatus {
  if (!input.hasPortal || !input.lastPublishedAt) {
    return "neverPublished";
  }

  const publishedAt = new Date(input.lastPublishedAt);
  const latestChange = input.changeTimestamps.reduce<Date | null>((max, ts) => {
    if (!ts) return max;
    const d = new Date(ts);
    if (!max || d > max) return d;
    return max;
  }, null);

  if (latestChange && latestChange > publishedAt) {
    return "unpublishedChanges";
  }

  return "published";
}

/** Resolve fleet showcase for client portal — frozen snapshot preferred at v3+. */
export function resolveSnapshotFleetShowcase(
  payload: ProposalSnapshotPayload | null,
  liveFleet: FleetShowcaseItem[]
): FleetShowcaseItem[] {
  if (payload && isSnapshotFleetFrozen(payload.renderSchemaVersion) && payload.fleetShowcase) {
    return payload.fleetShowcase.map((item, index) => ({
      id: item.id ?? `snapshot-${index}`,
      title: item.title,
      subtitle: item.subtitle ?? null,
      imageUrl: item.imageUrl,
      videoUrl: item.videoUrl ?? null,
      posterUrl: item.posterUrl ?? null,
      specs: item.specs ?? [],
      sortOrder: item.sortOrder ?? index,
      active: item.active ?? true,
    }));
  }
  return liveFleet;
}

/** Fleet page copy from snapshot branding when frozen, else live portal content. */
export function resolveSnapshotFleetCopy(
  payload: ProposalSnapshotPayload | null,
  liveContent: PortalContentData
): { fleetTitle: string; fleetBody: string | null } {
  if (payload && isSnapshotFleetFrozen(payload.renderSchemaVersion) && payload.branding) {
    return {
      fleetTitle: payload.branding.fleetTitle ?? liveContent.fleetTitle,
      fleetBody: payload.branding.fleetBody ?? liveContent.fleetBody,
    };
  }
  return {
    fleetTitle: liveContent.fleetTitle,
    fleetBody: liveContent.fleetBody,
  };
}

export const PORTAL_PUBLISH_STATUS_LABELS: Record<PortalPublishStatus, string> = {
  neverPublished: "Never published",
  published: "Published",
  unpublishedChanges: "Draft has unpublished changes",
};
