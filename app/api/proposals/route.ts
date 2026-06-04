import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { DEFAULT_SECTIONS, SECTION_COPY } from "@/lib/assumptions";
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
      companyName,
      contactName,
      contactEmail,
      contactPhone,
      prospectType,
      opportunityType,
      proposalName,
    } = body;

    if (!prospectName || !contactName || !contactEmail || !prospectType || !opportunityType) {
      return jsonError("Missing required prospect fields");
    }

    const prospect = await prisma.prospect.create({
      data: {
        prospectName,
        companyName,
        contactName,
        contactEmail,
        contactPhone,
        prospectType,
        opportunityType,
        createdById: user.id,
        internalNotes: body.internalNotes,
        clientSummary: body.clientSummary,
      },
    });

    const aircraft = await prisma.aircraftInstance.create({
      data: { prospectId: prospect.id },
    });

    const proposal = await prisma.proposal.create({
      data: {
        prospectId: prospect.id,
        aircraftInstanceId: aircraft.id,
        proposalName: proposalName ?? `${prospectName} — Atlas Proposal`,
        preparedById: user.id,
        preparedDate: new Date(),
      },
    });

    await prisma.proposalSection.createMany({
      data: DEFAULT_SECTIONS.map((s) => ({
        proposalId: proposal.id,
        sectionType: s.sectionType as SectionType,
        title: s.title,
        sortOrder: s.sortOrder,
        visible: s.sectionType !== "charter_strategy",
        bodyCopy: SECTION_COPY[s.sectionType] ?? null,
      })),
    });

    await prisma.proposalScenario.create({
      data: {
        proposalId: proposal.id,
        scenarioName: "Base Case",
        isBaseCase: true,
      },
    });

    return jsonOk({ proposal, prospect, aircraft }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
