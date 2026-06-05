import { redirect } from "next/navigation";
import { getInternalUser, getPortalSession, type PortalSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPortalContent, getFleetShowcase } from "@/lib/portal-content";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";

export async function requirePortalSession(slug: string): Promise<PortalSession> {
  const session = await getPortalSession();
  if (session?.slug === slug) return session;

  // Staff preview from workspace/pipeline — no client PIN required.
  const internal = await getInternalUser();
  if (internal) {
    const portal = await prisma.clientPortal.findUnique({
      where: { slug },
      select: { id: true, proposalId: true, active: true },
    });
    if (portal?.active) {
      return {
        portalId: portal.id,
        proposalId: portal.proposalId,
        slug,
      };
    }
  }

  redirect(`/${slug}`);
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
