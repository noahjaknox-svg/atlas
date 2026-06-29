"use client";

import type { ExperiencePageBlock, ExperienceSectionSnapshot } from "@/lib/experience-content";
import type { BlockDiagnostic } from "@/lib/portal-block-diagnostics";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";
import { buildPortalVariableContext } from "@/lib/portal-variables";
import { GenericChapterV2 } from "@/components/client/experience/v2/layouts/generic-chapter-v2";
import { cn } from "@/lib/utils";
import type { PreviewViewport } from "./portal-designer-types";
import type { PortalLayoutSettings } from "@/lib/portal-layout-settings";

const SAMPLE_PAYLOAD: ProposalSnapshotPayload = {
  version: 1,
  renderSchemaVersion: 3,
  publishedAt: new Date().toISOString(),
  proposal: {
    id: "preview",
    name: "Preview Proposal",
    status: "draft",
    preparedDate: new Date().toISOString(),
    clientSummary: null,
  },
  prospect: {
    name: "Sample Prospect",
    companyName: "Sample Co.",
    contactName: "Alex Morgan",
    contactEmail: "alex@example.com",
  },
  aircraft: {
    manufacturer: "Bombardier",
    model: "Global 6000",
    tailNumber: null,
    year: 2019,
    category: "large",
    proposedHomeBase: "KSDL",
    clientSummary: null,
  },
  assumptions: {},
  sections: [],
  proForma: {
    blendedFuelPrice: 0,
    fuelCostPerHour: 0,
    variableCostPerHour: 0,
    charterRevenue: 120000,
    fuelSurchargeRevenue: 0,
    totalRevenue: 120000,
    charterVariableCost: 0,
    ownerVariableCost: 0,
    netBeforeOwner: 0,
    netAnnualCost: 850000,
    netMonthlyCost: 70833,
    costPerOwnerHour: 4250,
    insuranceEstimate: 0,
    lineItems: [],
  },
  metrics: {
    netAnnualCost: 850000,
    netMonthlyCost: 70833,
    ownerHours: 200,
    charterRevenueOffset: 120000,
    costPerOwnerHour: 4250,
    aircraftValue: 45000000,
  },
};

export function PortalDesignerPreview({
  section,
  viewport,
  payload,
  contactName,
  selectedBlockId,
  onSelectBlock,
  previewMode = true,
  designMode = false,
  blocks,
  diagnostics = [],
  designViewport,
  onBlockContextMenu,
  layoutSettings,
}: {
  section: ExperienceSectionSnapshot;
  viewport: PreviewViewport;
  payload?: ProposalSnapshotPayload | null;
  contactName?: string;
  selectedBlockId?: string | null;
  onSelectBlock?: (id: string) => void;
  previewMode?: boolean;
  designMode?: boolean;
  blocks?: ExperiencePageBlock[];
  diagnostics?: BlockDiagnostic[];
  designViewport?: PreviewViewport;
  onBlockContextMenu?: (
    e: React.MouseEvent,
    block: ExperiencePageBlock,
    path: import("@/lib/portal-block-layout").BlockPath
  ) => void;
  layoutSettings?: PortalLayoutSettings;
}) {
  const resolvedPayload = payload ?? SAMPLE_PAYLOAD;
  const variableContext = buildPortalVariableContext(resolvedPayload, contactName);
  const previewSection =
    blocks != null
      ? { ...section, contentBlocks: { ...section.contentBlocks, pageBlocks: blocks } }
      : section;

  return (
    <div className="flex h-full flex-col bg-[#05070d]">
      <div className="flex shrink-0 items-center justify-center border-b border-atlas-border/40 px-3 py-2">
        <p className="text-xs uppercase tracking-wider text-atlas-muted">
          {viewport === "desktop" ? "Desktop preview" : "Mobile preview"}
          {diagnostics.length > 0 ? (
            <span className="ml-2 text-amber-300">
              · {diagnostics.length} warning{diagnostics.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </p>
      </div>
      <div
        className={cn(
          "flex min-h-0 flex-1",
          viewport === "desktop" ? "px-4 py-2" : "items-start justify-center overflow-auto p-4"
        )}
      >
        <div
          className={cn(
            "overflow-hidden rounded-lg border border-white/10 bg-[#0B0F1A] shadow-2xl transition-[width]",
            viewport === "desktop"
              ? "flex h-full min-h-0 w-full max-w-none flex-col"
              : "w-[390px] max-w-full"
          )}
        >
          <div
            className={cn(
              viewport === "desktop"
                ? "h-full min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"
                : "max-h-[min(720px,70vh)] overflow-y-auto p-4 sm:p-6"
            )}
          >
            <GenericChapterV2
              section={previewSection}
              variableContext={variableContext}
              selectedBlockId={selectedBlockId}
              onSelectBlock={onSelectBlock}
              previewMode={previewMode}
              designMode={designMode}
              designViewport={designViewport ?? viewport}
              onBlockContextMenu={onBlockContextMenu}
              layoutSettings={layoutSettings}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
