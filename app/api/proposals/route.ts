import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getExperienceMasterTemplates } from "@/lib/portal-content";
import { aircraftAssumptionCategory } from "@/lib/aircraft-workspace";
import type { SectionType } from "@prisma/client";

export async function GET() {
  try {
    await requireInternalUser();
    const proposals = await prisma.proposal.findMany({
      where: { deletedAt: null },
      include: { prospect: true, clientPortal: true },
      orderBy: { updatedAt: "desc" },
    });
    return jsonOk(proposals);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireInternalUser();
    const body = await request.json();

    const {
      clientName,
      prospectName,
      aircraftModel,
      contactName,
      contactEmail,
      contactPhone,
      prospectType,
      proposalName,
    } = body;

    const resolvedClientName = (clientName ?? prospectName)?.trim();
    if (!resolvedClientName) {
      return jsonError("Prospect name is required");
    }

    const prospect = await prisma.prospect.create({
      data: {
        prospectName: resolvedClientName,
        companyName: null,
        contactName: contactName?.trim() ?? "",
        contactEmail: contactEmail?.trim() ?? "",
        contactPhone: contactPhone?.trim() || null,
        prospectType: prospectType || "other",
        opportunityType: "aircraft_management",
        createdById: user.id,
        internalNotes: body.internalNotes ?? null,
        clientSummary: body.clientSummary ?? null,
      },
    });

    const proposal = await prisma.proposal.create({
      data: {
        prospectId: prospect.id,
        aircraftInstanceId: null as string | null,
        proposalName: proposalName ?? `${resolvedClientName} — Atlas Proposal`,
        preparedById: user.id,
        preparedDate: new Date(),
      },
    });

    const aircraft = await prisma.aircraftInstance.create({
      data: { prospectId: prospect.id, proposalId: proposal.id },
    });

    await prisma.proposal.update({
      where: { id: proposal.id },
      data: { aircraftInstanceId: aircraft.id },
    });

    const masterTemplates = await getExperienceMasterTemplates();

    await prisma.proposalSection.createMany({
      data: masterTemplates.map((s) => ({
        proposalId: proposal.id,
        sectionType: s.sectionType as SectionType,
        title: s.title,
        sortOrder: s.sortOrder,
        visible: s.visible,
        bodyCopy: s.bodyCopy,
        layoutVariant: s.layoutVariant,
        contentBlocks: s.contentBlocks ?? undefined,
        signatoryName: s.signatoryName,
        signatoryTitle: s.signatoryTitle,
        imageUrl: s.imageUrl,
        videoUrl: s.videoUrl,
        posterUrl: s.posterUrl,
        calloutMetricLabel: s.calloutMetricLabel,
        calloutMetricValue: s.calloutMetricValue,
      })),
    });

    const { ensureThreeScenarios } = await import("@/lib/scenarios");
    await ensureThreeScenarios(proposal.id, aircraft.id);

    const { ensureDraftPortalForProposal } = await import("@/lib/draft-portal");
    await ensureDraftPortalForProposal(proposal.id);

    const acCategory = aircraftAssumptionCategory(aircraft.id);
    await prisma.proposalAssumption.create({
      data: {
        proposalId: proposal.id,
        category: acCategory,
        assumptionName: "aircraft_profile_mode",
        value: "general",
        sourceType: "manual",
      },
    });

    if (aircraftModel?.trim()) {
      const acCategory = aircraftAssumptionCategory(aircraft.id);
      const initialAssumptions = [
        { assumptionName: "aircraft_model", value: aircraftModel.trim() },
        { assumptionName: "opportunity_type", value: "aircraft_management" },
      ];
      for (const row of initialAssumptions) {
        await prisma.proposalAssumption.create({
          data: {
            proposalId: proposal.id,
            category: acCategory,
            assumptionName: row.assumptionName,
            value: row.value,
            sourceType: "manual",
          },
        });
      }
    }

    return jsonOk({ proposal, prospect, aircraft }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
