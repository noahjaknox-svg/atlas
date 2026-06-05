import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPortalContent, getFleetShowcase } from "@/lib/portal-content";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";

export async function requirePortalSession(slug: string) {
  const session = await getPortalSession();
  if (!session || session.slug !== slug) {
    redirect(`/${slug}`);
  }
  return session;
}

export async function loadActivePortal(slug: string) {
  const portal = await prisma.clientPortal.findUnique({
    where: { slug },
    include: {
      proposal: {
        include: {
          snapshots: { orderBy: { versionNumber: "desc" }, take: 1 },
          prospect: { select: { contactName: true, prospectName: true } },
        },
      },
    },
  });

  if (!portal?.active) redirect(`/${slug}`);

  const snapshot = portal.proposal.snapshots[0];
  const payload = snapshot
    ? (snapshot.snapshotJson as unknown as ProposalSnapshotPayload)
    : null;

  const [content, fleet] = await Promise.all([getPortalContent(), getFleetShowcase()]);

  const branding = {
    heroCloudImageUrl:
      payload?.branding?.heroCloudImageUrl ?? content.heroCloudImageUrl,
    heroCloudVideoUrl:
      payload?.branding?.heroCloudVideoUrl ?? content.heroCloudVideoUrl,
    logoUrl: payload?.branding?.logoUrl ?? content.logoUrl,
  };

  return {
    portal,
    payload,
    content,
    fleet,
    branding,
    contactName: portal.proposal.prospect.contactName,
    prospectName: portal.proposal.prospect.prospectName,
    clientDisplayName: portal.proposal.prospect.contactName,
  };
}

export async function trackPortalView(portalId: string) {
  await prisma.clientPortal.update({
    where: { id: portalId },
    data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
  });
}
