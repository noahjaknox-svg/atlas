import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { InternalShell } from "@/components/internal/internal-shell";
import { requireDepartmentPageAccess } from "@/lib/require-department-page";
import { getInternalShellProps } from "@/lib/departments";
import { PortalDesignerShell } from "@/components/internal/portal-designer/portal-designer-shell";
import { PROSPECT_PORTAL_DESIGNER } from "@/lib/product-terminology";
import { computePortalPublishStatus } from "@/lib/portal-publish-status";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";
import { getPortalContent } from "@/lib/portal-content";
import type { DesignerSection } from "@/components/internal/portal-designer/portal-designer-types";
import type { ExperienceContentBlocks } from "@/lib/experience-content";
import { ROUTES } from "@/lib/routes";
import Link from "next/link";

export const metadata: Metadata = {
  title: `${PROSPECT_PORTAL_DESIGNER} · Atlas`,
};

export default async function ProposalPortalDesignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getInternalUser();
  if (!user) redirect("/login");
  requireDepartmentPageAccess(user, "aircraft_management");
  const shell = getInternalShellProps(user);

  const { id } = await params;

  const proposal = await prisma.proposal.findFirst({
    where: { id, deletedAt: null },
    include: {
      prospect: true,
      sections: { orderBy: { sortOrder: "asc" } },
      clientPortal: true,
      snapshots: { orderBy: { versionNumber: "desc" }, take: 1 },
      aircraftInstance: true,
      aircraft: { where: { includedOnProposal: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!proposal) notFound();

  const primaryAircraft =
    proposal.aircraft.find((a) => a.id === proposal.aircraftInstanceId) ??
    proposal.aircraft[0] ??
    proposal.aircraftInstance;

  const initialSections: DesignerSection[] = proposal.sections.map((s) => ({
    id: s.id,
    sectionType: s.sectionType,
    pageSlug: s.pageSlug,
    title: s.title,
    bodyCopy: s.bodyCopy,
    visible: s.visible,
    sortOrder: s.sortOrder,
    imageUrl: s.imageUrl,
    videoUrl: s.videoUrl,
    posterUrl: s.posterUrl,
    calloutMetricLabel: s.calloutMetricLabel,
    calloutMetricValue: s.calloutMetricValue,
    layoutVariant: s.layoutVariant,
    signatoryName: s.signatoryName,
    signatoryTitle: s.signatoryTitle,
    contentBlocks: (s.contentBlocks as ExperienceContentBlocks | null) ?? null,
    usageTypeIds: s.usageTypeIds,
  }));

  const usageTypes = await prisma.usageType.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  const lastSnapshot = proposal.snapshots[0];
  const publishedSnapshot = lastSnapshot
    ? (lastSnapshot.snapshotJson as unknown as ProposalSnapshotPayload)
    : null;

  const publishStatus = computePortalPublishStatus({
    lastPublishedAt: lastSnapshot?.publishedAt,
    hasPortal: !!proposal.clientPortal,
    changeTimestamps: [
      proposal.updatedAt,
      ...proposal.sections.map((s) => s.updatedAt),
      primaryAircraft?.updatedAt,
    ],
  });

  const portalContent = await getPortalContent();

  return (
    <InternalShell {...shell} workspace>
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 border-b border-atlas-border px-4 py-2">
          <Link
            href={ROUTES.aircraftManagement.proposal(id)}
            className="text-xs text-atlas-accent hover:underline"
          >
            ← Back to Proposal Workspace
          </Link>
        </div>
        <div className="min-h-0 flex-1">
          <PortalDesignerShell
            mode="proposal"
            initialSections={initialSections}
            initialBrandingContent={portalContent}
            proposalId={proposal.id}
            aircraftId={primaryAircraft?.id}
            portalSlug={proposal.clientPortal?.slug ?? null}
            publishedSnapshot={publishedSnapshot}
            publishStatus={publishStatus}
            lastPublishedAt={lastSnapshot?.publishedAt?.toISOString() ?? null}
            usageTypes={usageTypes}
            initialHero={
              primaryAircraft
                ? {
                    clientSummary: primaryAircraft.clientSummary ?? "",
                    portalImageUrl: primaryAircraft.portalImageUrl ?? "",
                    portalVideoUrl: primaryAircraft.portalVideoUrl ?? "",
                    portalSpecHighlights: Array.isArray(primaryAircraft.portalSpecHighlights)
                      ? (primaryAircraft.portalSpecHighlights as string[])
                      : [],
                  }
                : undefined
            }
          />
        </div>
      </div>
    </InternalShell>
  );
}
