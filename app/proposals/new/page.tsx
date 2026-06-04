import { InternalShell } from "@/components/internal/internal-shell";
import { ProspectStepForm } from "@/components/internal/prospect-step";

export default function NewProposalPage() {
  return (
    <InternalShell>
      <ProspectStepForm mode="new" />
    </InternalShell>
  );
}
