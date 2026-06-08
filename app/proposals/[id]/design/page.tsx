import { notFound, redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPortalUrl } from "@/lib/portal-credentials";
import { ensureExperienceSections } from "@/lib/ensure-experience-sections";
import { InternalShell } from "@/components/internal/internal-shell";
import { ProposalDesignWorkspace } from "@/components/internal/proposal-design/proposal-design-workspace";
import type { ExperienceContentBlocks } from "@/lib/experience-content";
import type { DesignSectionRow } from "@/components/internal/proposal-design/proposal-design-workspace";

export default async function ProposalDesignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await ensureExperienceSections(id);

  const [user, proposal] = await Promise.all([
    getInternalUser(),
    prisma.proposal.findUnique({
      where: { id },
      include: {
        sections: { orderBy: { sortOrder: "asc" } },
        clientPortal: true,
      },
    }),
  ]);

  if (!user) redirect("/login");
  if (!proposal) notFound();

  const sections: DesignSectionRow[] = proposal.sections.map((s) => ({
    id: s.id,
    sectionType: s.sectionType,
    title: s.title,
    bodyCopy: s.bodyCopy,
    visible: s.visible,
    sortOrder: s.sortOrder,
    imageUrl: s.imageUrl,
    videoUrl: s.videoUrl ?? null,
    posterUrl: s.posterUrl ?? null,
    signatoryName: s.signatoryName ?? null,
    signatoryTitle: s.signatoryTitle ?? null,
    contentBlocks: (s.contentBlocks as ExperienceContentBlocks | null) ?? null,
  }));

  return (
    <InternalShell userName={user.name} isAdmin={user.role === "admin"} workspace>
      <ProposalDesignWorkspace
        proposalId={proposal.id}
        proposalName={proposal.proposalName}
        sections={sections}
        portalSlug={proposal.clientPortal?.slug ?? null}
        portalUrl={proposal.clientPortal ? getPortalUrl(proposal.clientPortal.slug) : null}
      />
    </InternalShell>
  );
}
