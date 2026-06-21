"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProspectFormState, ProspectSavePayload } from "@/lib/workspace-sections";
import type { AtlasUserOption } from "@/components/internal/workspace/prospect-panel";

const inputClass = "atlas-input";

export function CustomerDetailsSidebar({
  prospect,
  currentManager,
  assignedToId,
  assignedToName,
  atlasUsers,
  onSave,
  saveState,
  readOnly = false,
  onArchive,
  archiveLoading = false,
}: {
  prospect: ProspectFormState;
  currentManager: string;
  assignedToId: string | null;
  assignedToName: string | null;
  atlasUsers: AtlasUserOption[];
  onSave: (data: ProspectSavePayload) => Promise<void>;
  saveState: "idle" | "saving" | "saved" | "error";
  readOnly?: boolean;
  onArchive?: () => Promise<void>;
  archiveLoading?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [draft, setDraft] = useState(prospect);
  const [draftManager, setDraftManager] = useState(currentManager);
  const [draftAssignedId, setDraftAssignedId] = useState(assignedToId ?? "");

  useEffect(() => {
    if (!editing) {
      setDraft(prospect);
      setDraftManager(currentManager);
      setDraftAssignedId(assignedToId ?? "");
    }
  }, [prospect, currentManager, assignedToId, editing]);

  async function handleSave() {
    await onSave({
      ...draft,
      currentManager: draftManager,
      assignedToId: draftAssignedId || null,
    });
    setEditing(false);
  }

  const archiveAction =
    !readOnly && onArchive ? (
      <>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-1 w-full text-xs text-atlas-muted hover:text-atlas-danger"
          disabled={archiveLoading}
          onClick={() => setArchiveDialogOpen(true)}
        >
          Archive customer
        </Button>
        <ArchiveCustomerDialog
          open={archiveDialogOpen}
          onOpenChange={setArchiveDialogOpen}
          customerName={prospect.prospectName}
          archiveLoading={archiveLoading}
          onConfirm={() => void onArchive().then(() => setArchiveDialogOpen(false))}
        />
      </>
    ) : null;

  if (editing) {
    return (
      <div className="shrink-0 space-y-2 px-3 py-2">
        <p className="atlas-kicker text-atlas-accent">Edit customer</p>
        <Field label="Prospect name *">
          <Input
            className={inputClass}
            value={draft.prospectName}
            onChange={(e) => setDraft((d) => ({ ...d, prospectName: e.target.value }))}
          />
        </Field>
        <Field label="Contact *">
          <Input
            className={inputClass}
            value={draft.contactName}
            onChange={(e) => setDraft((d) => ({ ...d, contactName: e.target.value }))}
          />
        </Field>
        <Field label="Email *">
          <Input
            className={inputClass}
            value={draft.contactEmail}
            onChange={(e) => setDraft((d) => ({ ...d, contactEmail: e.target.value }))}
          />
        </Field>
        <Field label="Phone">
          <Input
            className={inputClass}
            value={draft.contactPhone}
            onChange={(e) => setDraft((d) => ({ ...d, contactPhone: e.target.value }))}
          />
        </Field>
        <Field label="Current manager">
          <Input
            className={inputClass}
            value={draftManager}
            onChange={(e) => setDraftManager(e.target.value)}
          />
        </Field>
        <Field label="Assigned to">
          <select
            className={inputClass}
            value={draftAssignedId}
            onChange={(e) => setDraftAssignedId(e.target.value)}
          >
            <option value="">Unassigned</option>
            {atlasUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" size="sm" className="flex-1 text-xs" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" className="flex-1 text-xs" disabled={saveState === "saving"} onClick={() => void handleSave()}>
            {saveState === "saving" ? "Saving…" : "Save"}
          </Button>
        </div>
        {archiveAction}
      </div>
    );
  }

  return (
    <div className="shrink-0 px-3 py-2">
      <p className="atlas-kicker">Customer</p>
      <dl className="mt-3 space-y-2.5 text-sm">
        <DetailRow label="Prospect" value={prospect.prospectName || "—"} />
        <DetailRow label="Contact" value={prospect.contactName} />
        <DetailRow label="Email" value={prospect.contactEmail} />
        <DetailRow label="Phone" value={prospect.contactPhone || "—"} />
        <DetailRow label="Manager" value={currentManager || "—"} />
        <DetailRow label="Assigned" value={assignedToName ?? "Unassigned"} />
      </dl>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-3 w-full text-xs"
        disabled={readOnly}
        onClick={() => setEditing(true)}
      >
        Edit customer
      </Button>
      {archiveAction}
    </div>
  );
}

function ArchiveCustomerDialog({
  open,
  onOpenChange,
  customerName,
  archiveLoading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  archiveLoading: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-atlas-border bg-atlas-surface p-6 shadow-xl">
          <Dialog.Title className="font-serif text-lg text-atlas-text">
            Archive customer?
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-atlas-muted">
            Archive {customerName || "this customer"}? This removes the deal from the pipeline and
            deactivates the client portal.
          </Dialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={archiveLoading} onClick={onConfirm}>
              {archiveLoading ? "Archiving…" : "Archive"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="atlas-caption w-20 shrink-0">{label}</dt>
      <dd className="min-w-0 flex-1 truncate text-sm text-atlas-text">{value}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <Label className="atlas-kicker block">{label}</Label>
      {children}
    </div>
  );
}
