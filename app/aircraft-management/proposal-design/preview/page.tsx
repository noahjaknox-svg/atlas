import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { verifyDesignerPreviewToken } from "@/lib/portal-designer-preview-token";
import { getPortalContent } from "@/lib/portal-content";
import { resolvePortalBranding } from "@/lib/portal-constants";
import { RENDER_SCHEMA_VERSION, type ExperienceSectionSnapshot } from "@/lib/experience-content";
import { PortalShell } from "@/components/client/experience/portal-shell";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";

export const dynamic = "force-dynamic";

function emptyPreviewPayload(
  sections: ExperienceSectionSnapshot[],
  clientSummary: string | null | undefined,
  renderSchemaVersion: number
): ProposalSnapshotPayload {
  return {
    version: 1,
    renderSchemaVersion,
    publishedAt: new Date().toISOString(),
    proposal: {
      id: "preview",
      name: "Preview",
      status: "draft",
      preparedDate: null,
      clientSummary: clientSummary ?? null,
    },
    prospect: {
      name: "Preview",
      companyName: "Preview Co.",
      contactName: "Preview Contact",
      contactEmail: "preview@example.com",
    },
    aircraft: {
      manufacturer: null,
      model: null,
      tailNumber: null,
      year: null,
      category: null,
      proposedHomeBase: null,
      clientSummary: clientSummary ?? null,
    },
    assumptions: {},
    sections: sections as ProposalSnapshotPayload["sections"],
    proForma: {
      blendedFuelPrice: 0,
      fuelCostPerHour: 0,
      variableCostPerHour: 0,
      charterRevenue: 0,
      fuelSurchargeRevenue: 0,
      totalRevenue: 0,
      charterVariableCost: 0,
      ownerVariableCost: 0,
      netBeforeOwner: 0,
      netAnnualCost: 0,
      netMonthlyCost: 0,
      costPerOwnerHour: 0,
      insuranceEstimate: 0,
      lineItems: [],
    },
    metrics: {
      netAnnualCost: 0,
      netMonthlyCost: 0,
      ownerHours: 0,
      charterRevenueOffset: 0,
      costPerOwnerHour: 0,
      aircraftValue: 0,
    },
  };
}

export default async function MasterDesignerPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ previewToken?: string; page?: string }>;
}) {
  const user = await getInternalUser();
  if (!user) redirect("/login");

  const { previewToken, page } = await searchParams;
  if (!previewToken) redirect("/aircraft-management/proposal-design");

  const verified = await verifyDesignerPreviewToken(previewToken);
  if (!verified || verified.proposalId !== "master") {
    redirect("/aircraft-management/proposal-design");
  }

  const content = await getPortalContent();
  const branding = resolvePortalBranding(content, null);
  const sections = verified.payload.sections as ExperienceSectionSnapshot[];
  const pageSlug = page ?? verified.payload.activePageSlug;
  const renderSchemaVersion = verified.payload.renderSchemaVersion ?? RENDER_SCHEMA_VERSION;
  const payload = emptyPreviewPayload(
    sections,
    verified.payload.hero?.clientSummary,
    renderSchemaVersion
  );

  return (
    <PortalShell
      renderSchemaVersion={payload.renderSchemaVersion}
      slug="preview"
      sections={sections}
      logoUrl={branding.logoUrl ?? undefined}
      clientDisplayName={payload.prospect.companyName ?? payload.prospect.name}
      disclaimer={sections.find((s) => s.sectionType === "disclaimer")?.bodyCopy ?? null}
      branding={branding}
      draftMode
      experienceBootstrap={{
        payload,
        contactName: payload.prospect.contactName ?? "",
        initialPageSlug: pageSlug,
        aircraftParam: null,
        initialClientSnapshot: null,
      }}
    >
      {null}
    </PortalShell>
  );
}
