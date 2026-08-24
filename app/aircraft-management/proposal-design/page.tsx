import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { requireDepartmentPageAccess } from "@/lib/require-department-page";
import { getInternalShellProps } from "@/lib/departments";
import { InternalShell } from "@/components/internal/internal-shell";
import { PortalDesignerShell } from "@/components/internal/portal-designer/portal-designer-shell";
import { getPortalContent, getFleetShowcase, getExperienceMasterTemplates } from "@/lib/portal-content";
import { PROSPECT_PORTAL_DESIGNER } from "@/lib/product-terminology";
import type { DesignerSection } from "@/components/internal/portal-designer/portal-designer-types";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: `${PROSPECT_PORTAL_DESIGNER} · Atlas`,
};

export default async function ProposalDesignPage() {
  const user = await getInternalUser();
  if (!user) redirect("/login");
  requireDepartmentPageAccess(user, "aircraft_management");

  const shell = getInternalShellProps(user);

  const [content, fleet, templates, usageTypes] = await Promise.all([
    getPortalContent(),
    getFleetShowcase(),
    getExperienceMasterTemplates(),
    prisma.usageType.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const initialSections: DesignerSection[] = templates.map((t) => ({
    ...t,
    videoUrl: t.videoUrl ?? null,
    posterUrl: t.posterUrl ?? null,
    calloutMetricLabel: t.calloutMetricLabel ?? null,
    calloutMetricValue: t.calloutMetricValue ?? null,
    layoutVariant: t.layoutVariant ?? null,
    signatoryName: t.signatoryName ?? null,
    signatoryTitle: t.signatoryTitle ?? null,
    contentBlocks: t.contentBlocks ?? null,
  }));

  return (
    <InternalShell {...shell} workspace>
      <PortalDesignerShell
        mode="master"
        initialSections={initialSections}
        initialBrandingContent={content}
        initialFleet={fleet}
        usageTypes={usageTypes}
      />
    </InternalShell>
  );
}
