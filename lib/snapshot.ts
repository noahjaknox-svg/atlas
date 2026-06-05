import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { getPortalContent } from "./portal-content";
import type { AssumptionMap } from "./assumptions";
import { assumptionsToMap } from "./assumptions";
import type { ProFormaResult } from "./proforma";
import type { ExperienceContentBlocks } from "./experience-content";
import type { AircraftSnapshotEntry } from "./portal-aircraft-types";
import { buildAircraftSnapshotList } from "./snapshot-aircraft";
import { computeWorkspaceProFormaForClient } from "./workspace-proforma-client";

export interface ProposalSnapshotPayload {
  version: number;
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
  };
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
}

export async function buildSnapshotPayload(
  proposalId: string
): Promise<ProposalSnapshotPayload> {
  const proposal = await prisma.proposal.findUniqueOrThrow({
    where: { id: proposalId },
    include: {
      prospect: true,
      aircraftInstance: { include: { aircraftMaster: true } },
      aircraft: {
        where: { includedOnProposal: true },
        include: { aircraftMaster: true },
        orderBy: { createdAt: "asc" },
      },
      assumptions: true,
      sections: { orderBy: { sortOrder: "asc" } },
      scenarios: { where: { isBaseCase: true }, take: 1 },
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

  const aircraftList = buildAircraftSnapshotList({
    includedAircraft,
    primaryAircraftInstanceId: proposal.aircraftInstanceId,
    assumptionRows,
    allAssumptions: proposal.assumptions,
    prospectOpportunityType: proposal.prospect.opportunityType,
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

  const master = proposal.aircraftInstance?.aircraftMaster;
  const portalBranding = await getPortalContent();
  const primaryAircraft = primaryEntry ?? null;

  return {
    version: 1,
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
    sections: proposal.sections.map((s) => ({
        sectionType: s.sectionType,
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
      })),
    branding: {
      heroCloudImageUrl: portalBranding.heroCloudImageUrl,
      heroCloudVideoUrl: portalBranding.heroCloudVideoUrl,
      logoUrl: portalBranding.logoUrl,
    },
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
  };
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
