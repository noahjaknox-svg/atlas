"use client";

import { useMemo } from "react";
import { PortalShell } from "@/components/client/experience/portal-shell";
import { sectionNavSlug } from "@/lib/experience-page-slug";
import { RENDER_SCHEMA_VERSION } from "@/lib/experience-content";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";
import type { DesignerSection, PortalDesignerHeroState } from "./portal-designer-types";
import { Button } from "@/components/ui/button";

export function PortalDesignerLivePreview({
  open,
  onClose,
  sections,
  hero,
  activeSection,
  publishedSnapshot,
  portalSlug,
  viewport,
  mode = "proposal",
}: {
  open: boolean;
  onClose: () => void;
  sections: DesignerSection[];
  hero?: PortalDesignerHeroState;
  activeSection: DesignerSection;
  publishedSnapshot?: ProposalSnapshotPayload | null;
  portalSlug?: string | null;
  viewport: "desktop" | "mobile";
  mode?: "master" | "proposal";
}) {
  const payload = useMemo((): ProposalSnapshotPayload => {
    if (publishedSnapshot) {
      return {
        ...publishedSnapshot,
        sections: sections as ProposalSnapshotPayload["sections"],
        proposal: {
          ...publishedSnapshot.proposal,
          clientSummary: hero?.clientSummary ?? publishedSnapshot.proposal.clientSummary,
        },
        aircraft: {
          ...publishedSnapshot.aircraft,
          clientSummary: hero?.clientSummary ?? publishedSnapshot.aircraft.clientSummary,
        },
      };
    }

    return {
      version: 1,
      renderSchemaVersion: RENDER_SCHEMA_VERSION,
      publishedAt: new Date().toISOString(),
      proposal: {
        id: "preview",
        name: "Preview",
        status: "draft",
        preparedDate: null,
        clientSummary: hero?.clientSummary ?? null,
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
        clientSummary: hero?.clientSummary ?? null,
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
  }, [publishedSnapshot, sections, hero]);

  if (!open) return null;

  const pageSlug = sectionNavSlug(activeSection);
  const branding = {
    heroCloudImageUrl: publishedSnapshot?.branding?.heroCloudImageUrl ?? "",
    heroCloudVideoUrl: publishedSnapshot?.branding?.heroCloudVideoUrl ?? null,
    logoUrl: publishedSnapshot?.branding?.logoUrl ?? null,
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/70">
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0B0F1A] px-4 py-3">
        <div>
          <p className="text-sm font-medium text-white">Live preview</p>
          <p className="text-[10px] text-white/50">
            Unsaved in-memory state · {viewport} · /{portalSlug ?? "portal"}/experience/{pageSlug}
            {mode === "master" ? " · Preview uses sample prospect data until applied to a proposal." : null}
          </p>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </header>
      <div className="flex min-h-0 flex-1 justify-center overflow-auto p-4">
        <div
          className={
            viewport === "desktop"
              ? "h-full w-full max-w-6xl overflow-hidden rounded-lg border border-white/10"
              : "h-[844px] w-[390px] shrink-0 overflow-hidden rounded-[2rem] border border-white/10"
          }
        >
          <PortalShell
            renderSchemaVersion={payload.renderSchemaVersion}
            slug={portalSlug ?? "preview"}
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
        </div>
      </div>
    </div>
  );
}
