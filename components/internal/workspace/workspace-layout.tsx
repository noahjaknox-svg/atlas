"use client";

import { useMemo } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { CustomerDetailsSidebar } from "@/components/internal/workspace/customer-details-sidebar";
import {
  ProposalCommentsPanel,
  type ProposalComment,
} from "@/components/internal/workspace/proposal-comments-panel";
import { WorkspaceAircraftRail } from "@/components/internal/workspace/workspace-aircraft-rail";
import { getMissingInfoCount } from "@/lib/required-fields";
import type { AssumptionMap } from "@/lib/assumptions";
import type { ProspectFormState, ProspectSavePayload } from "@/lib/workspace-sections";
import type { AtlasUserOption } from "@/components/internal/workspace/prospect-panel";
import type { AircraftListItem } from "./aircraft-list-panel";

export function WorkspaceLayout({
  proposalId,
  proposalName,
  status,
  onProposalNameChange,
  aircraft,
  selectedId,
  onSelectAircraft,
  onAddAircraft,
  onRemoveAircraft,
  onDuplicateAircraft,
  onToggleIncluded,
  assumptionsByAircraft,
  prospect,
  currentManager,
  assignedToId,
  assignedToName,
  atlasUsers,
  onProspectSave,
  prospectSaveState,
  saveLabel,
  currentUserId,
  currentUserName,
  initialComments,
  experienceManager,
  ownerBar,
  footer,
  children,
}: {
  proposalId: string;
  proposalName: string;
  status: string;
  onProposalNameChange: (name: string) => void;
  aircraft: AircraftListItem[];
  selectedId: string | null;
  onSelectAircraft: (id: string) => void;
  onAddAircraft: () => void;
  onRemoveAircraft: (id: string) => void;
  onDuplicateAircraft: (id: string) => void;
  onToggleIncluded: (id: string, included: boolean) => void;
  assumptionsByAircraft: Record<string, AssumptionMap>;
  prospect: ProspectFormState;
  currentManager: string;
  assignedToId: string | null;
  assignedToName: string | null;
  atlasUsers: AtlasUserOption[];
  onProspectSave: (data: ProspectSavePayload) => Promise<void>;
  prospectSaveState: "idle" | "saving" | "saved" | "error";
  saveLabel: string;
  currentUserId: string;
  currentUserName: string;
  initialComments?: ProposalComment[];
  experienceManager?: React.ReactNode;
  ownerBar?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { missingCount, completeness } = useMemo(() => {
    const includedAircraft = aircraft.filter((a) => a.includedOnProposal !== false);
    const allAssumptionRows = includedAircraft.flatMap((ac) => {
      const map = assumptionsByAircraft[ac.id] ?? ac.assumptions;
      return Object.entries(map).map(([assumptionName, value]) => ({
        assumptionName,
        value: String(value),
      }));
    });
    const missing = getMissingInfoCount(allAssumptionRows);
    return {
      missingCount: missing,
      completeness:
        allAssumptionRows.length > 0
          ? Math.max(0, Math.round((1 - missing / 10) * 100))
          : 0,
    };
  }, [aircraft, assumptionsByAircraft]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1">
      <aside className="flex h-full w-[272px] shrink-0 flex-col border-r border-atlas-border bg-atlas-surface">
        <div className="shrink-0 border-b border-atlas-border px-3 py-2">
          <Link href="/pipeline" className="atlas-caption hover:text-atlas-accent">
            ← Pipeline
          </Link>
          <input
            type="text"
            value={proposalName}
            onChange={(e) => onProposalNameChange(e.target.value)}
            className="mt-2 w-full rounded border border-transparent bg-transparent font-serif text-lg text-atlas-text hover:border-atlas-border focus:border-atlas-accent focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <span className="atlas-caption">
              {completeness}% · {missingCount} missing
            </span>
          </div>
          <p className="atlas-caption mt-1">{saveLabel}</p>
        </div>

        <CustomerDetailsSidebar
          prospect={prospect}
          currentManager={currentManager}
          assignedToId={assignedToId}
          assignedToName={assignedToName}
          atlasUsers={atlasUsers}
          onSave={onProspectSave}
          saveState={prospectSaveState}
        />

        {experienceManager}

        <div className="flex min-h-0 flex-1 flex-col border-y border-atlas-border/80 bg-atlas-bg/30">
          <ProposalCommentsPanel
            proposalId={proposalId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            initialComments={initialComments}
          />
        </div>

      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <WorkspaceAircraftRail
          aircraft={aircraft}
          selectedId={selectedId}
          assumptionsByAircraft={assumptionsByAircraft}
          onSelect={onSelectAircraft}
          onAdd={onAddAircraft}
          onToggleIncluded={onToggleIncluded}
          onRemove={onRemoveAircraft}
          onDuplicate={onDuplicateAircraft}
        />

        {ownerBar}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </main>
      </div>

      {footer}
    </div>
  );
}
