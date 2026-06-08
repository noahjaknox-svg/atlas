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
      prospectName,
      aircraftModel,
      contactName,
      contactEmail,
      contactPhone,
      prospectType,
      proposalName,
    } = body;

    if (!prospectName?.trim()) {
      return jsonError("Prospect name is required");
    }

    const resolvedContactName = contactName?.trim() || prospectName.trim();
    const resolvedEmail =
      contactEmail?.trim() || user.email || "pending@prismjet.internal";

    const prospect = await prisma.prospect.create({
      data: {
        prospectName: prospectName.trim(),
        companyName: null,
        contactName: resolvedContactName,
        contactEmail: resolvedEmail,
        contactPhone: contactPhone?.trim() || null,
        prospectType: prospectType || "other",
        opportunityType: "aircraft_management",
        createdById: user.id,
        internalNotes: body.internalNotes,
        clientSummary: body.clientSummary,
      },
    });

    const proposal = await prisma.proposal.create({
      data: {
        prospectId: prospect.id,
        aircraftInstanceId: null as string | null,
        proposalName: proposalName ?? `${prospectName} — Atlas Proposal`,
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
