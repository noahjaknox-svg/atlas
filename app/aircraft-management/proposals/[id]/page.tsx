import dynamic from "next/dynamic";
import { notFound, redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { perfTimed } from "@/lib/perf-log";
import { getPortalUrl } from "@/lib/portal-credentials";
import { decryptPinFromStorage } from "@/lib/pin-vault";
import { loadProposalAircraft } from "@/lib/load-proposal-aircraft";
import {
  aircraftAssumptionCategory,
  mergeLegacyAssumptions,
  assumptionsFromInstance,
  applyProspectOpportunityFallback,
} from "@/lib/aircraft-workspace";
import { InternalShell } from "@/components/internal/internal-shell";
import { loadAllOwnersForProposal } from "@/lib/proposal-owners-db";
import { profileFromLegacyAssumptions, getAllocationMode } from "@/lib/proposal-owners";
import type { OwnerExpenseAllocationMode } from "@/lib/owner-expense-allocation";
import { ensureExperienceSections } from "@/lib/ensure-experience-sections";
import { parseSpecHighlights } from "@/lib/portal-aircraft-types";

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

  const [user, proposal, atlasUsers, comments] = await perfTimed(
    "proposal workspace query",
    () =>
      Promise.all([
        getInternalUser(),
        ensureExperienceSections(id).then(() =>
          prisma.proposal.findUnique({
            where: { id },
            include: {
              prospect: true,
              aircraftInstance: { include: { warehouseAircraft: true } },
              assumptions: true,
              sections: { orderBy: { sortOrder: "asc" } },
              scenarios: true,
              clientPortal: true,
            },
          })
        ),
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
      ])
  );

  if (!user) redirect("/login");
  if (!proposal) notFound();

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
    const category = aircraftAssumptionCategory(ac.id);
    let assumptionMap = mergeLegacyAssumptions(assumptionRows, category);
    if (
      proposal.aircraftInstanceId === ac.id &&
      Object.keys(assumptionMap).length === 0
    ) {
      assumptionMap = mergeLegacyAssumptions(assumptionRows, "__legacy__");
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
      aircraftMaster: ac.warehouseAircraft
        ? {
            manufacturer: ac.warehouseAircraft.manufacturer,
            model: ac.warehouseAircraft.model,
          }
        : null,
    };
    if (ac.fboName) assumptionMap.fbo_name = ac.fboName;
    if (ac.warehouseAircraftId) assumptionMap.aircraft_master_id = ac.warehouseAircraftId;
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

  const workspaceData = {
    id: proposal.id,
    proposalName: proposal.proposalName,
    status: proposal.status,
    updatedAt: proposal.updatedAt.toISOString(),
    deletedAt: proposal.deletedAt?.toISOString() ?? null,
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
    portalPin: proposal.clientPortal?.pinCiphertext
      ? decryptPinFromStorage(proposal.clientPortal.pinCiphertext)
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
    sections: proposal.sections.map((s) => ({
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
    })),
    scenarios: proposal.scenarios.map((s) => ({
      aircraftInstanceId: s.aircraftInstanceId ?? null,
      isBaseCase: s.isBaseCase,
      netAnnualCost: s.netAnnualCost?.toString() ?? null,
      netMonthlyCost: s.netMonthlyCost?.toString() ?? null,
      costPerOwnerHour: s.costPerOwnerHour?.toString() ?? null,
      ownerHours: s.ownerHours?.toString() ?? null,
    })),
    clientPortal: proposal.clientPortal
      ? {
          slug: proposal.clientPortal.slug,
          active: proposal.clientPortal.active,
          portalUrl: getPortalUrl(proposal.clientPortal.slug),
        }
      : null,
    initialClientEditable: Object.fromEntries(
      proposal.assumptions
        .filter((a) => a.editableByClient)
        .map((a) => [a.assumptionName, true])
    ),
    ownersByAircraft,
    allocationModeByAircraft,
  };

  return (
    <InternalShell userName={user?.name} isAdmin={user?.role === "admin"} workspace>
      <ProposalWorkspace
        data={workspaceData}
        isAdmin={user?.role === "admin"}
      />
    </InternalShell>
  );
}
