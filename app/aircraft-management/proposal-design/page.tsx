import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { InternalShell } from "@/components/internal/internal-shell";
import { PortalDesignerShell } from "@/components/internal/portal-designer/portal-designer-shell";
import { getPortalContent, getFleetShowcase, getExperienceMasterTemplates } from "@/lib/portal-content";
import { PROSPECT_PORTAL_DESIGNER } from "@/lib/product-terminology";
import type { DesignerSection } from "@/components/internal/portal-designer/portal-designer-types";

export const metadata: Metadata = {
  title: `${PROSPECT_PORTAL_DESIGNER} · Atlas`,
};

export default async function ProposalDesignPage() {
  const user = await getInternalUser();
  if (!user) redirect("/login");

  const [content, fleet, templates] = await Promise.all([
    getPortalContent(),
    getFleetShowcase(),
    getExperienceMasterTemplates(),
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
    <InternalShell userName={user.name} isAdmin={user.role === "admin"} workspace>
      <PortalDesignerShell
        mode="master"
        initialSections={initialSections}
        initialBrandingContent={content}
        initialFleet={fleet}
      />
    </InternalShell>
  );
}
