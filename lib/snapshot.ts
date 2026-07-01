import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { perfTimed } from "./perf-log";
import type { FleetShowcaseItem } from "./portal-constants";
import { getPortalContent, getExperienceMasterTemplates, getFleetShowcase } from "./portal-content";
import { parsePortalLayoutSettings, type PortalLayoutSettings } from "./portal-layout-settings";
import type { AssumptionMap } from "./assumptions";
import { assumptionsToMap } from "./assumptions";
import type { ProFormaResult } from "./proforma";
import type { ExperienceContentBlocks } from "./experience-content";
import { DECK_VERSION, RENDER_SCHEMA_VERSION } from "./experience-content";
import { resolvePublishedSections } from "./experience-resolve";
import type { AircraftSnapshotEntry } from "./portal-aircraft-types";
import { buildAircraftSnapshotList } from "./snapshot-aircraft";
import { validateSnapshotPayload } from "./snapshot-validation";
import { computeWorkspaceProFormaForClient } from "./workspace-proforma-client";

export interface ProposalSnapshotPayload {
  version: number;
  /**
   * Section-resolution schema for this snapshot. When >= 1, the client portal
   * renders `sections` verbatim and never merges live master templates, so the
   * published proposal stays frozen until republished. Absent on legacy snapshots.
   */
  renderSchemaVersion?: number;
  /** Global deck-template generation this snapshot was built from. */
  deckVersion?: number;
  publishedAt: string;
  proposal: {
    id: string;
    name: string;
    status: string;
    preparedDate: string | null;
    clientSummary: string | null;
  };
  prospect: {
    name: string;
    companyName: string | null;
    contactName: string;
    contactEmail: string;
  };
  aircraft: {
    manufacturer: string | null;
    model: string | null;
    tailNumber: string | null;
    year: number | null;
    category: string | null;
    proposedHomeBase: string | null;
    clientSummary: string | null;
  };
  assumptions: Record<
    string,
    {
      value: string;
      unit: string | null;
      visibleToClient: boolean;
      editableByClient: boolean;
      clientExplanation: string | null;
      category: string;
    }
  >;
  sections: Array<{
    sectionType: string;
    pageSlug?: string | null;
    title: string;
    bodyCopy: string | null;
    visible: boolean;
    sortOrder: number;
    imageUrl: string | null;
    videoUrl: string | null;
    posterUrl: string | null;
    calloutMetricLabel: string | null;
    calloutMetricValue: string | null;
    layoutVariant: string | null;
    contentBlocks: ExperienceContentBlocks | null;
    signatoryName: string | null;
    signatoryTitle: string | null;
  }>;
  branding?: {
    heroCloudImageUrl: string | null;
    heroCloudVideoUrl: string | null;
    logoUrl: string | null;
    aboutTitle?: string | null;
    aboutBody?: string | null;
    fleetTitle?: string | null;
    fleetBody?: string | null;
    layoutSettings?: PortalLayoutSettings;
  };
  /** Frozen fleet carousel cards (renderSchemaVersion >= 3). */
  fleetShowcase?: Array<Omit<FleetShowcaseItem, "active"> & { active?: boolean }>;
  proForma: ProFormaResult;
  metrics: {
    netAnnualCost: number;
    netMonthlyCost: number;
    ownerHours: number;
    charterRevenueOffset: number;
    costPerOwnerHour: number;
    aircraftValue: number;
  };
  aircraftList?: AircraftSnapshotEntry[];
  /** Proposal primary aircraft — default for portal pro forma when no aircraft param. */
  primaryAircraftInstanceId?: string | null;
}

export type BuildSnapshotPayloadOptions = {
  /**
   * - undefined: full warehouse resolve + pro forma for every aircraft (publish).
   * - []: lightweight aircraft list only (draft non-pro-forma pages).
   * - [id, …]: full resolve only for these aircraft (draft pro forma preview).
   */
  fullyResolveAircraftIds?: string[];
};

export async function buildSnapshotPayload(
  proposalId: string,
  options?: BuildSnapshotPayloadOptions
): Promise<ProposalSnapshotPayload> {
  return perfTimed("snapshot.buildPayload", async () => {
  const proposal = await prisma.proposal.findUniqueOrThrow({
    where: { id: proposalId },
    include: {
      prospect: true,
      aircraftInstance: { include: { warehouseAircraft: true } },
      aircraft: {
        where: { includedOnProposal: true },
        include: { warehouseAircraft: true },
        orderBy: { createdAt: "asc" },
      },
      assumptions: true,
      sections: { orderBy: { sortOrder: "asc" } },
      scenarios: {
        where: { isBaseCase: true },
      },
    },
  });

  const assumptionRows = proposal.assumptions.map((a) => ({
    category: a.category,
    assumptionName: a.assumptionName,
    value: a.value,
  }));

  const includedAircraft =
    proposal.aircraft.length > 0
      ? proposal.aircraft
      : proposal.aircraftInstance
        ? [proposal.aircraftInstance]
        : [];

  const baseScenariosByAircraft: Record<string, (typeof proposal.scenarios)[number]> = {};
  for (const s of proposal.scenarios) {
    if (s.aircraftInstanceId) {
      baseScenariosByAircraft[s.aircraftInstanceId] = s;
    }
  }

  const aircraftList = await buildAircraftSnapshotList({
    proposalId,
    includedAircraft,
    primaryAircraftInstanceId: proposal.aircraftInstanceId,
    assumptionRows,
    allAssumptions: proposal.assumptions,
    prospectOpportunityType: proposal.prospect.opportunityType,
    baseScenariosByAircraft,
    fullyResolveAircraftIds: options?.fullyResolveAircraftIds,
  });

  const primaryEntry =
    aircraftList.find((a) => a.id === proposal.aircraftInstanceId) ?? aircraftList[0];

  const map = primaryEntry
    ? Object.fromEntries(
        Object.entries(primaryEntry.assumptions).map(([k, v]) => [k, v.value])
      )
    : assumptionsToMap(proposal.assumptions);
  const proForma =
    primaryEntry?.proForma ??
    computeWorkspaceProFormaForClient(assumptionsToMap(proposal.assumptions) as AssumptionMap)
      .proForma;

  const clientAssumptions: ProposalSnapshotPayload["assumptions"] = {};
  for (const a of proposal.assumptions) {
    if (!a.visibleToClient) continue;
    clientAssumptions[a.assumptionName] = {
      value: a.value,
      unit: a.unit,
      visibleToClient: a.visibleToClient,
      editableByClient: a.editableByClient,
      clientExplanation: a.clientExplanation,
      category: a.category,
    };
  }

  const master = proposal.aircraftInstance?.warehouseAircraft;
  const portalBranding = await getPortalContent();
  const fleetShowcase = await getFleetShowcase();
  const primaryAircraft = primaryEntry ?? null;

  // Proposal working copy is resolved at publish; snapshot stores the full result.
  const masterTemplates = await getExperienceMasterTemplates();
  const rawSections = proposal.sections.map((s) => ({
    sectionType: s.sectionType,
    pageSlug: s.pageSlug ?? null,
    title: s.title,
    bodyCopy: s.bodyCopy,
    visible: s.visible,
    sortOrder: s.sortOrder,
    imageUrl: s.imageUrl,
    videoUrl: s.videoUrl ?? null,
    posterUrl: s.posterUrl ?? null,
    calloutMetricLabel: s.calloutMetricLabel,
    calloutMetricValue: s.calloutMetricValue,
    layoutVariant: s.layoutVariant ?? null,
    contentBlocks: (s.contentBlocks as ExperienceContentBlocks | null) ?? null,
    signatoryName: s.signatoryName ?? null,
    signatoryTitle: s.signatoryTitle ?? null,
  }));
  const resolvedSections = resolvePublishedSections(rawSections, masterTemplates);

  return {
    version: 1,
    renderSchemaVersion: RENDER_SCHEMA_VERSION,
    deckVersion: DECK_VERSION,
    publishedAt: new Date().toISOString(),
    proposal: {
      id: proposal.id,
      name: proposal.proposalName,
      status: proposal.status,
      preparedDate: proposal.preparedDate?.toISOString() ?? null,
      clientSummary: proposal.clientSummary,
    },
    prospect: {
      name: proposal.prospect.prospectName,
      companyName: proposal.prospect.companyName,
      contactName: proposal.prospect.contactName,
      contactEmail: proposal.prospect.contactEmail,
    },
    aircraft: {
      manufacturer: primaryAircraft?.manufacturer ?? master?.manufacturer ?? null,
      model: primaryAircraft?.model ?? master?.model ?? map.aircraft_model ?? null,
      tailNumber: primaryAircraft?.tailNumber ?? proposal.aircraftInstance?.tailNumber ?? null,
      year: primaryAircraft?.year ?? proposal.aircraftInstance?.year ?? null,
      category: primaryAircraft?.category ?? master?.aircraftCategory ?? map.aircraft_category ?? null,
      proposedHomeBase:
        primaryAircraft?.proposedHomeBase ?? proposal.aircraftInstance?.proposedHomeBaseIcao ?? null,
      clientSummary:
        primaryAircraft?.clientSummary ?? proposal.aircraftInstance?.clientSummary ?? null,
    },
    assumptions: clientAssumptions,
    sections: resolvedSections,
    branding: {
      heroCloudImageUrl: portalBranding.heroCloudImageUrl,
      heroCloudVideoUrl: portalBranding.heroCloudVideoUrl,
      logoUrl: portalBranding.logoUrl,
      aboutTitle: portalBranding.aboutTitle,
      aboutBody: portalBranding.aboutBody,
      fleetTitle: portalBranding.fleetTitle,
      fleetBody: portalBranding.fleetBody,
      layoutSettings: parsePortalLayoutSettings(portalBranding.layoutSettings),
    },
    fleetShowcase: fleetShowcase.map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      imageUrl: item.imageUrl,
      videoUrl: item.videoUrl,
      posterUrl: item.posterUrl,
      specs: item.specs,
      sortOrder: item.sortOrder,
      active: item.active,
    })),
    proForma,
    metrics: primaryAircraft?.metrics ?? {
      netAnnualCost: proForma.netAnnualCost,
      netMonthlyCost: proForma.netMonthlyCost,
      ownerHours: parseFloat(map.owner_annual_hours ?? "0") || 0,
      charterRevenueOffset: proForma.totalRevenue,
      costPerOwnerHour: proForma.costPerOwnerHour,
      aircraftValue: parseFloat(map.aircraft_value ?? "0") || 0,
    },
    aircraftList: aircraftList.length > 0 ? aircraftList : undefined,
    primaryAircraftInstanceId: proposal.aircraftInstanceId,
  };
  });
}

export async function createProposalSnapshot(
  proposalId: string,
  publishedById: string,
  notes?: string
) {
  const existing = await prisma.proposalSnapshot.count({
    where: { proposalId },
  });

  const payload = await buildSnapshotPayload(proposalId);

  const validationErrors = validateSnapshotPayload(payload);
  if (validationErrors.length > 0) {
    throw new Error(
      `Cannot publish proposal: snapshot validation failed:\n${validationErrors.join("\n")}`
    );
  }

  return prisma.proposalSnapshot.create({
    data: {
      proposalId,
      versionNumber: existing + 1,
      snapshotJson: payload as unknown as Prisma.InputJsonValue,
      publishedById,
      notes,
    },
  });
}
