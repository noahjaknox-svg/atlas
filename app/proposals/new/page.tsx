import { InternalShell } from "@/components/internal/internal-shell";
import { NewProposalDialog } from "@/components/internal/new-proposal-dialog";
import { Button } from "@/components/ui/button";

export default function NewProposalPage() {
  return (
    <InternalShell>
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="font-serif text-3xl">New Proposal</h1>
        <p className="mt-2 text-atlas-muted">
          Start with prospect name and optional aircraft — then configure everything in one workspace.
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
