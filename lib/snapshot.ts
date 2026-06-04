import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { assumptionsToMap } from "./assumptions";
import {
  assumptionsToProFormaInputs,
  calculateProForma,
  type ProFormaResult,
} from "./proforma";

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
    calloutMetricLabel: string | null;
    calloutMetricValue: string | null;
  }>;
  proForma: ProFormaResult;
  metrics: {
    netAnnualCost: number;
    netMonthlyCost: number;
    ownerHours: number;
    charterRevenueOffset: number;
    costPerOwnerHour: number;
    aircraftValue: number;
  };
}

export async function buildSnapshotPayload(
  proposalId: string
): Promise<ProposalSnapshotPayload> {
  const proposal = await prisma.proposal.findUniqueOrThrow({
    where: { id: proposalId },
    include: {
      prospect: true,
      aircraftInstance: { include: { aircraftMaster: true } },
      assumptions: true,
      sections: { orderBy: { sortOrder: "asc" } },
      scenarios: { where: { isBaseCase: true }, take: 1 },
    },
  });

  const map = assumptionsToMap(proposal.assumptions);
  const proForma = calculateProForma(assumptionsToProFormaInputs(map));

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
      manufacturer: master?.manufacturer ?? null,
      model: master?.model ?? map.aircraft_model ?? null,
      tailNumber: proposal.aircraftInstance?.tailNumber ?? null,
      year: proposal.aircraftInstance?.year ?? null,
      category: master?.aircraftCategory ?? map.aircraft_category ?? null,
      proposedHomeBase: proposal.aircraftInstance?.proposedHomeBaseIcao ?? null,
      clientSummary: proposal.aircraftInstance?.clientSummary ?? null,
    },
    assumptions: clientAssumptions,
    sections: proposal.sections
      .filter((s) => s.visible)
      .map((s) => ({
        sectionType: s.sectionType,
        title: s.title,
        bodyCopy: s.bodyCopy,
        visible: s.visible,
        sortOrder: s.sortOrder,
        imageUrl: s.imageUrl,
        calloutMetricLabel: s.calloutMetricLabel,
        calloutMetricValue: s.calloutMetricValue,
      })),
    proForma,
    metrics: {
      netAnnualCost: proForma.netAnnualCost,
      netMonthlyCost: proForma.netMonthlyCost,
      ownerHours: parseFloat(map.owner_annual_hours ?? "0") || 0,
      charterRevenueOffset: proForma.totalRevenue,
      costPerOwnerHour: proForma.costPerOwnerHour,
      aircraftValue: parseFloat(map.aircraft_value ?? "0") || 0,
    },
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
