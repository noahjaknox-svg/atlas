import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { InternalShell } from "@/components/internal/internal-shell";
import { requireDepartmentPageAccess } from "@/lib/require-department-page";
import { getInternalShellProps } from "@/lib/departments";
import { ROUTES } from "@/lib/routes";
import { CLUB_DEFAULTS } from "@/lib/club-proforma";
import { loadClubInputs } from "@/lib/club-model-server";
import { ClubModelEditor } from "@/components/internal/club-model-editor";

export const metadata: Metadata = { title: "Club model · Atlas" };

export default async function ProposalClubModelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getInternalUser();
  if (!user) redirect("/login");
  requireDepartmentPageAccess(user, "aircraft_management");
  const shell = getInternalShellProps(user);

  const { id } = await params;
  const proposal = await prisma.proposal.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, proposalName: true },
  });
  if (!proposal) notFound();

  const stored = await loadClubInputs(id);

  return (
    <InternalShell {...shell} workspace>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center gap-4 border-b border-atlas-border px-4 py-2 text-xs">
          <Link href={ROUTES.aircraftManagement.proposal(id)} className="text-atlas-accent hover:underline">
            ← Back to Proposal Workspace
          </Link>
          <Link href={ROUTES.aircraftManagement.proposalDesignView(id)} className="text-atlas-accent hover:underline">
            Portal Designer
          </Link>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ClubModelEditor
            proposalId={id}
            proposalName={proposal.proposalName}
            enabled={stored != null}
            initialInputs={stored ?? CLUB_DEFAULTS}
          />
        </div>
      </div>
    </InternalShell>
  );
}
