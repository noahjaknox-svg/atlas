"use client";

import type { OwnerExpenseAllocationMode } from "@/lib/owner-expense-allocation";
import type { ProposalOwnerProfile } from "@/lib/proposal-owners";
import { OwnerControlsStrip } from "@/components/internal/workspace/owner-splits-panel";

export function WorkspaceOwnerBar({
  profiles,
  allocationMode,
  onProfilesChange,
  onAllocationModeChange,
}: {
  profiles: ProposalOwnerProfile[];
  allocationMode: OwnerExpenseAllocationMode;
  onProfilesChange: (profiles: ProposalOwnerProfile[]) => void;
  onAllocationModeChange: (mode: OwnerExpenseAllocationMode) => void;
}) {
  return (
    <div className="shrink-0 border-b border-atlas-border bg-atlas-surface/40 px-3 py-2">
      <OwnerControlsStrip
        profiles={profiles}
        allocationMode={allocationMode}
        onProfilesChange={onProfilesChange}
        onAllocationModeChange={onAllocationModeChange}
      />
    </div>
  );
}
