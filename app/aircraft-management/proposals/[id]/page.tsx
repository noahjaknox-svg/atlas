import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { perfTimed } from "@/lib/perf-log";
import { getPortalUrl } from "@/lib/portal-credentials";
import { decryptPinFromStorage } from "@/lib/pin-vault";
import { loadProposalAircraft } from "@/lib/load-proposal-aircraft";
import {
  assumptionsFromInstance,
  applyProspectOpportunityFallback,
} from "@/lib/aircraft-workspace";
import { mergeAssumptionRowsForInstance } from "@/lib/proposal-assumption-load";
import { InternalShell } from "@/components/internal/internal-shell";
import { requireDepartmentPageAccess } from "@/lib/require-department-page";
import { getInternalShellProps } from "@/lib/departments";
import { loadAllOwnersForProposal } from "@/lib/proposal-owners-db";
import { profileFromLegacyAssumptions, getAllocationMode } from "@/lib/proposal-owners";
import type { OwnerExpenseAllocationMode } from "@/lib/owner-expense-allocation";
import {
  experienceSectionCreateData,
  findMissingExperienceSections,
} from "@/lib/ensure-experience-sections";
import { getExperienceMasterTemplates } from "@/lib/portal-content";
import type { ExperienceSectionRow } from "@/components/internal/workspace/experience-manager-panel";
import { parseSpecHighlights } from "@/lib/portal-aircraft-types";
import { PROPOSAL_WORKSPACE } from "@/lib/product-terminology";

export const metadata: Metadata = {
  title: `${PROPOSAL_WORKSPACE} · Atlas`,
};

const ProposalWorkspace = dynamic(
  () =>
    import("@/components/internal/proposal-workspace").then((mod) => ({
      default: mod.ProposalWorkspace,
    })),
  {
    loading: () => (
      <div className="flex h-full animate-pulse flex-col gap-4 p-6">
        <div className="flex gap-4">
          <div className="h-10 w-64 rounded bg-atlas-surface" />
          <div className="h-10 flex-1 rounded bg-atlas-surface" />
        </div>
        <div className="flex flex-1 gap-4">
          <div className="w-56 rounded-lg bg-atlas-surface" />
          <div className="flex-1 rounded-lg bg-atlas-surface" />
        </div>
      </div>
    ),
  }
);

export default async function ProposalWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [user, proposal, atlasUsers, comments, masterTemplates] = await perfTimed(
    "proposal workspace query",
    () =>
      Promise.all([
        getInternalUser(),
        prisma.proposal.findUnique({
          where: { id },
          include: {
            prospect: true,
            aircraftInstance: { include: { aircraftType: true } },
            assumptions: true,
            sections: { orderBy: { sortOrder: "asc" } },
            scenarios: true,
            clientPortal: true,
            snapshots: {
              orderBy: { publishedAt: "desc" },
              take: 1,
              select: { publishedAt: true },
            },
          },
        }),
        prisma.user.findMany({
          where: { active: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
        prisma.proposalComment.findMany({
          where: { proposalId: id },
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        }),
        getExperienceMasterTemplates(),
      ])
  );

  if (!user) redirect("/login");
  requireDepartmentPageAccess(user, "aircraft_management");
  const shell = getInternalShellProps(user);
  if (!proposal) notFound();

  // Creation (POST /api/proposals) seeds sections and the draft portal, so this
  // read path only heals legacy proposals that predate those rows. The common
  // case runs zero writes and no extra round trips.
  let sections = proposal.sections;
  let clientPortal = proposal.clientPortal;
  const missingSections = findMissingExperienceSections(sections, masterTemplates);
  if (missingSections.length > 0 || !clientPortal) {
    await perfTimed("proposal workspace heal", async () => {
      if (missingSections.length > 0) {
        await prisma.proposalSection.createMany({
          data: experienceSectionCreateData(proposal.id, missingSections),
        });
        sections = await prisma.proposalSection.findMany({
          where: { proposalId: proposal.id },
          orderBy: { sortOrder: "asc" },
        });
      }
      if (!clientPortal) {
        const { ensureDraftPortalForProposal } = await import("@/lib/draft-portal");
        await ensureDraftPortalForProposal(proposal.id);
        clientPortal = await prisma.clientPortal.findUnique({
          where: { proposalId: proposal.id },
        });
      }
    });
  }

  const [aircraftList, ownersByAircraftRaw] = await Promise.all([
    loadProposalAircraft(proposal.id, proposal.prospectId, proposal.aircraftInstanceId),
    loadAllOwnersForProposal(proposal.id),
  ]);

  const assumptionRows = proposal.assumptions.map((a) => ({
    category: a.category,
    assumptionName: a.assumptionName,
    value: a.value,
  }));

  const prospectOpportunity = proposal.prospect.opportunityType;

  const aircraft = aircraftList.map((ac) => {
    let assumptionMap = mergeAssumptionRowsForInstance(assumptionRows, ac.id);
    if (
      proposal.aircraftInstanceId === ac.id &&
      Object.keys(assumptionMap).length === 0
    ) {
      assumptionMap = mergeAssumptionRowsForInstance(assumptionRows, null);
    }
    assumptionMap = applyProspectOpportunityFallback(assumptionMap, prospectOpportunity);
    const meta = {
      id: ac.id,
      year: ac.year,
      tailNumber: ac.tailNumber,
      serialNumber: ac.serialNumber,
      proposedHomeBaseIcao: ac.proposedHomeBaseIcao,
      estimatedValue: ac.estimatedValue?.toString() ?? null,
      valueSource: ac.valueSource,
      aircraftMaster: ac.aircraftType
        ? {
            manufacturer: ac.aircraftType.manufacturer,
            model: ac.aircraftType.model,
          }
        : null,
    };
    if (ac.fboName) assumptionMap.fbo_name = ac.fboName;
    if (ac.aircraftTypeId) assumptionMap.aircraft_master_id = ac.aircraftTypeId;
    if (ac.proposedHomeBaseIcao) {
      assumptionMap.home_airport_icao =
        assumptionMap.home_airport_icao ?? ac.proposedHomeBaseIcao;
      assumptionMap.proposed_home_base =
        assumptionMap.proposed_home_base ?? ac.proposedHomeBaseIcao;
    }

    const portalFields = ac as typeof ac & {
      portalImageUrl?: string | null;
      portalVideoUrl?: string | null;
      portalSpecHighlights?: unknown;
    };

    return {
      ...meta,
      includedOnProposal: ac.includedOnProposal ?? true,
      clientSummary: ac.clientSummary,
      portalImageUrl: portalFields.portalImageUrl ?? null,
      portalVideoUrl: portalFields.portalVideoUrl ?? null,
      portalSpecHighlights: parseSpecHighlights(portalFields.portalSpecHighlights),
      assumptions: { ...assumptionsFromInstance(meta), ...assumptionMap },
    };
  });

  const ownersByAircraft: Record<string, ReturnType<typeof profileFromLegacyAssumptions>> = {};
  const allocationModeByAircraft: Record<string, OwnerExpenseAllocationMode> = {};
  for (const ac of aircraft) {
    const map = ac.assumptions;
    ownersByAircraft[ac.id] =
      ownersByAircraftRaw[ac.id]?.length > 0
        ? ownersByAircraftRaw[ac.id]
        : profileFromLegacyAssumptions(map);
    allocationModeByAircraft[ac.id] = getAllocationMode(map);
  }

  const usageTypes = await prisma.usageType.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  const workspaceData = {
    id: proposal.id,
    proposalName: proposal.proposalName,
    status: proposal.status,
    updatedAt: proposal.updatedAt.toISOString(),
    deletedAt: proposal.deletedAt?.toISOString() ?? null,
    usageTypes,
    currentManager: proposal.prospect.currentManager ?? "",
    currentUserId: user.id,
    currentUserName: user.name,
    initialComments: comments.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      userId: c.userId,
      userName: c.user.name,
    })),
    portalPin: clientPortal?.pinCiphertext
      ? decryptPinFromStorage(clientPortal.pinCiphertext)
      : null,
    prospect: {
      prospectName: proposal.prospect.prospectName,
      contactName: proposal.prospect.contactName,
      contactEmail: proposal.prospect.contactEmail,
      contactPhone: proposal.prospect.contactPhone ?? "",
      internalNotes: proposal.prospect.internalNotes ?? "",
      clientSummary: proposal.prospect.clientSummary ?? "",
    },
    assignedToId: proposal.prospect.assignedToId,
    assignedToName:
      atlasUsers.find((u) => u.id === proposal.prospect.assignedToId)?.name ?? null,
    atlasUsers,
    selectedAircraftId: proposal.aircraftInstanceId,
    aircraft,
    sections: sections.map((s) => ({
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
      contentBlocks: (s.contentBlocks as ExperienceSectionRow["contentBlocks"]) ?? null,
      usageTypeIds: s.usageTypeIds,
    })),
    scenarios: proposal.scenarios.map((s) => ({
      aircraftInstanceId: s.aircraftInstanceId ?? null,
      isBaseCase: s.isBaseCase,
      netAnnualCost: s.netAnnualCost?.toString() ?? null,
      netMonthlyCost: s.netMonthlyCost?.toString() ?? null,
      costPerOwnerHour: s.costPerOwnerHour?.toString() ?? null,
      ownerHours: s.ownerHours?.toString() ?? null,
    })),
    clientPortal: clientPortal
      ? {
          slug: clientPortal.slug,
          active: clientPortal.active,
          portalUrl: getPortalUrl(clientPortal.slug),
        }
      : null,
    initialClientEditable: Object.fromEntries(
      proposal.assumptions
        .filter((a) => a.editableByClient)
        .map((a) => [a.assumptionName, true])
    ),
    ownersByAircraft,
    allocationModeByAircraft,
    lastPublishedAt: proposal.snapshots[0]?.publishedAt?.toISOString() ?? null,
    initialNeedsRepublish: (() => {
      const lastPublished = proposal.snapshots[0]?.publishedAt;
      if (!lastPublished || !clientPortal) return false;
      const candidates = [
        proposal.updatedAt,
        proposal.prospect.updatedAt,
        ...proposal.assumptions.map((a) => a.updatedAt),
        ...sections.map((s) => s.updatedAt),
        ...aircraftList.map((ac) => ac.updatedAt),
      ];
      const latest = candidates.reduce(
        (max, d) => (d > max ? d : max),
        proposal.updatedAt
      );
      return latest > lastPublished;
    })(),
  };

  return (
    <InternalShell {...shell} workspace>
      <ProposalWorkspace data={workspaceData} />
    </InternalShell>
  );
}
