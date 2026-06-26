"use client";

import { useMemo } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { ROUTES } from "@/lib/routes";
import { PROPOSAL_WORKSPACE } from "@/lib/product-terminology";
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
  onRefreshWarehouseData,
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
  ownerBar,
  footer,
  deletedAt,
  archiveLoading,
  onArchive,
  onRestore,
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
  onRefreshWarehouseData: (id: string) => void;
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
  ownerBar?: React.ReactNode;
  footer?: React.ReactNode;
  deletedAt?: string | null;
  archiveLoading?: boolean;
  onArchive?: () => Promise<void>;
  onRestore?: () => Promise<void>;
  children: React.ReactNode;
}) {
  const isArchived = deletedAt != null;
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
          <Link href={ROUTES.aircraftManagement.pipeline} className="atlas-caption hover:text-atlas-accent">
            ← Pipeline
          </Link>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-atlas-muted">
            {PROPOSAL_WORKSPACE}
          </p>
          <input
            type="text"
            value={proposalName}
            onChange={(e) => onProposalNameChange(e.target.value)}
            readOnly={isArchived}
            className="mt-2 w-full rounded border border-transparent bg-transparent font-serif text-lg text-atlas-text hover:border-atlas-border focus:border-atlas-accent focus:outline-none read-only:cursor-default read-only:opacity-80"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            {isArchived ? (
              <span className="rounded bg-atlas-border/80 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-atlas-muted">
                Archived
              </span>
            ) : null}
            <span className="atlas-caption">
              {completeness}% · {missingCount} missing
            </span>
          </div>
          <p className="atlas-caption mt-1">{saveLabel}</p>
          {isArchived ? (
            <div className="mt-2 rounded border border-atlas-border/80 bg-atlas-bg/50 px-2 py-2">
              <p className="text-[11px] text-atlas-muted">
                This deal is archived and hidden from the pipeline. Prospect portal access is
                deactivated.
              </p>
              {onRestore ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-2 w-full text-xs"
                  disabled={archiveLoading}
                  onClick={() => void onRestore()}
                >
                  {archiveLoading ? "Restoring…" : "Restore to pipeline"}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        <CustomerDetailsSidebar
          prospect={prospect}
          currentManager={currentManager}
          assignedToId={assignedToId}
          assignedToName={assignedToName}
          atlasUsers={atlasUsers}
          onSave={onProspectSave}
          saveState={prospectSaveState}
          readOnly={isArchived}
          onArchive={!isArchived ? onArchive : undefined}
          archiveLoading={archiveLoading}
        />

        <div className="flex min-h-0 flex-1 flex-col border-t border-atlas-border/80 bg-atlas-bg/30">
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
          onRefreshWarehouse={onRefreshWarehouseData}
          readOnly={isArchived}
        />

        {ownerBar}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </main>
      </div>

      {footer}
    </div>
  );
}
