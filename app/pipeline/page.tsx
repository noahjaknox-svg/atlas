import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getInternalUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCardSubtitle, getPipelineBadges } from "@/lib/pipeline";
import { getMissingRequiredFields } from "@/lib/required-fields";
import { InternalShell } from "@/components/internal/internal-shell";
import { PipelineBoard } from "@/components/internal/pipeline-board";
import type { PipelineCardData } from "@/components/internal/pipeline-card";

export default async function PipelinePage() {
  const user = await getInternalUser();
  if (!user) redirect("/login");

  const [proposals, rawAtlasUsers] = await Promise.all([
    prisma.proposal.findMany({
      where: { deletedAt: null },
      include: {
        prospect: true,
        aircraftInstance: { include: { aircraftMaster: true } },
        clientPortal: true,
        assumptions: {
          select: { assumptionName: true, value: true, confidence: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const atlasUsers = Array.from(
    new Map(rawAtlasUsers.map((u) => [u.id, u])).values()
  );

  const initialCards: PipelineCardData[] = proposals.map((p) => ({
    id: p.id,
    prospectName: p.prospect.prospectName,
    subtitle: getCardSubtitle({
      prospectName: p.prospect.prospectName,
      companyName: p.prospect.companyName,
      aircraftInstance: p.aircraftInstance,
    }),
    pipelineStage: p.pipelineStage,
    status: p.status,
    isParked: p.isParked,
    updatedAt: p.updatedAt.toISOString(),
    assignedToId: p.prospect.assignedToId,
    assigneeName:
      atlasUsers.find((u) => u.id === p.prospect.assignedToId)?.name ?? null,
    aircraftCategory: p.aircraftInstance?.aircraftMaster?.aircraftCategory ?? null,
    badges: getPipelineBadges({
      status: p.status,
      pipelineStage: p.pipelineStage,
      isParked: p.isParked,
      assumptions: p.assumptions,
      clientPortal: p.clientPortal,
    }),
    missingFieldLabels: getMissingRequiredFields(p.assumptions),
  }));

  return (
    <InternalShell userName={user.name} isAdmin={user.role === "admin"}>
      <h1 className="font-serif text-2xl">Pipeline</h1>
      <p className="mt-1 text-sm text-atlas-muted">Sales workflow</p>

      <Suspense fallback={<p className="mt-6 text-atlas-muted">Loading pipeline…</p>}>
        <PipelineBoard
          initialCards={initialCards}
          atlasUsers={atlasUsers}
          isAdmin={user.role === "admin"}
        />
      </Suspense>
    </InternalShell>
  );
}
