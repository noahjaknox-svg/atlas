import { notFound } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { InternalShell } from "@/components/internal/internal-shell";
import { WizardShell } from "@/components/internal/wizard-shell";
import { ProposalWizardStep } from "@/components/internal/proposal-wizard-step";

export default async function ProposalEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { id } = await params;
  const { step: stepParam } = await searchParams;
  const step = Math.min(10, Math.max(1, parseInt(stepParam ?? "1", 10) || 1));

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: {
      prospect: true,
      aircraftInstance: { include: { aircraftMaster: true } },
      assumptions: true,
      scenarios: { where: { isBaseCase: true }, take: 1 },
      clientPortal: true,
    },
  });

  if (!proposal) notFound();

  const user = await getInternalUser();

  return (
    <InternalShell userName={user?.name}>
      <div className="mb-6">
        <h1 className="font-serif text-3xl">{proposal.proposalName}</h1>
        <p className="text-atlas-muted">{proposal.prospect.prospectName}</p>
      </div>
      <WizardShell proposalId={id} currentStep={step}>
        <ProposalWizardStep
          proposalId={id}
          step={step}
          proposal={proposal}
          isAdmin={user?.role === "admin"}
        />
      </WizardShell>
    </InternalShell>
  );
}
