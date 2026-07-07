import { redirect } from "next/navigation";
import { getInternalUser } from "@/lib/auth";
import { requireDepartmentPageAccess } from "@/lib/require-department-page";
import { getInternalShellProps } from "@/lib/departments";
import { InternalShell } from "@/components/internal/internal-shell";
import { NewProposalDialog } from "@/components/internal/new-proposal-dialog";
import { Button } from "@/components/ui/button";

export default async function NewProposalPage() {
  const user = await getInternalUser();
  if (!user) redirect("/login");
  requireDepartmentPageAccess(user, "aircraft_management");

  const shell = getInternalShellProps(user);

  return (
    <InternalShell {...shell}>
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="font-serif text-3xl">New Proposal</h1>
        <p className="mt-2 text-atlas-muted">
          Enter the prospect name to open the proposal workspace. Add contact details and aircraft
          there.
        </p>
        <div className="mt-8 flex justify-center">
          <NewProposalDialog
            defaultOpen
            trigger={<Button>Create proposal</Button>}
          />
        </div>
      </div>
    </InternalShell>
  );
}
