"use client";

import { useEffect, useState } from "react";
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
}: {
  prospect: ProspectFormState;
  currentManager: string;
  assignedToId: string | null;
  assignedToName: string | null;
  atlasUsers: AtlasUserOption[];
  onSave: (data: ProspectSavePayload) => Promise<void>;
  saveState: "idle" | "saving" | "saved" | "error";
}) {
  const [editing, setEditing] = useState(false);
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
        onClick={() => setEditing(true)}
      >
        Edit customer
      </Button>
    </div>
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
