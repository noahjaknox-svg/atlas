"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProspectFormState, ProspectSavePayload } from "@/lib/workspace-sections";
import { PROSPECT_NAME_LABEL, EDIT_PROSPECT } from "@/lib/product-terminology";

const inputClass =
  "h-8 w-full rounded border border-atlas-border/80 bg-atlas-bg px-2 text-xs focus:border-atlas-accent focus:outline-none";

export type AtlasUserOption = { id: string; name: string };

export function ProspectPanel({
  savedProspect,
  savedCurrentManager,
  assignedToId,
  assignedToName,
  atlasUsers,
  onSave,
  saveState,
  embedded,
  compact,
}: {
  savedProspect: ProspectFormState;
  savedCurrentManager: string;
  assignedToId: string | null;
  assignedToName: string | null;
  atlasUsers: AtlasUserOption[];
  onSave: (data: ProspectSavePayload) => Promise<void>;
  saveState: "idle" | "saving" | "saved" | "error";
  /** When true, renders inside left sidebar without outer chrome */
  embedded?: boolean;
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProspectFormState>(savedProspect);
  const [draftManager, setDraftManager] = useState(savedCurrentManager);
  const [draftAssignedId, setDraftAssignedId] = useState(assignedToId ?? "");

  useEffect(() => {
    if (!editing) {
      setDraft(savedProspect);
      setDraftManager(savedCurrentManager);
      setDraftAssignedId(assignedToId ?? "");
    }
  }, [savedProspect, savedCurrentManager, assignedToId, editing]);

  function startEdit() {
    setDraft({ ...savedProspect });
    setDraftManager(savedCurrentManager);
    setDraftAssignedId(assignedToId ?? "");
    setEditing(true);
  }

  function cancelEdit() {
    setDraft({ ...savedProspect });
    setDraftManager(savedCurrentManager);
    setDraftAssignedId(assignedToId ?? "");
    setEditing(false);
  }

  async function handleSave() {
    await onSave({
      ...draft,
      currentManager: draftManager,
      assignedToId: draftAssignedId || null,
    });
    setEditing(false);
  }

  const saveHint =
    saveState === "saving"
      ? "Saving prospect…"
      : saveState === "saved"
        ? "Prospect saved"
        : saveState === "error"
          ? "Save failed"
          : null;

  return (
    <div
      className={
        embedded
          ? "flex flex-col border-b border-atlas-border"
          : "flex h-full flex-col border-r border-atlas-border bg-atlas-surface/40"
      }
    >
      {!embedded && (
        <div className="border-b border-atlas-border px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-atlas-accent">Prospect</p>
          <p className="mt-0.5 font-serif text-lg leading-tight">
            {savedProspect.prospectName || "Unnamed"}
          </p>
        </div>
      )}

      {embedded && !editing && (
        <div className={cn("px-3", compact ? "py-2" : "py-3")}>
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-wider text-atlas-accent">Prospect</p>
              <p className="truncate font-serif text-sm leading-tight">
                {savedProspect.prospectName || "Unnamed"}
              </p>
              {assignedToName && (
                <p className="mt-0.5 truncate text-[9px] text-atlas-muted">{assignedToName}</p>
              )}
            </div>
            {!editing && (
              <button
                type="button"
                onClick={startEdit}
                className="shrink-0 text-[9px] text-atlas-accent hover:underline"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      )}

      <div
        className={cn(
          "atlas-scroll text-xs",
          embedded
            ? compact
              ? "px-3 pb-2"
              : "max-h-[200px] overflow-y-auto p-3"
            : "flex-1 overflow-y-auto p-4"
        )}
      >
        {editing ? (
          <div className="space-y-3">
            <Field label={`${PROSPECT_NAME_LABEL} *`}>
              <Input
                className={inputClass}
                value={draft.prospectName}
                onChange={(e) => setDraft((d) => ({ ...d, prospectName: e.target.value }))}
              />
            </Field>
            <Field label="Primary contact *">
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
                placeholder="Incumbent management company"
              />
            </Field>
            <Field label="Lead assigned">
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
            <Field label="Internal notes">
              <textarea
                className={`${inputClass} min-h-[72px] py-2`}
                value={draft.internalNotes}
                onChange={(e) => setDraft((d) => ({ ...d, internalNotes: e.target.value }))}
                rows={3}
              />
            </Field>
            <Field label="Prospect-facing summary">
              <textarea
                className={`${inputClass} min-h-[72px] py-2`}
                value={draft.clientSummary}
                onChange={(e) => setDraft((d) => ({ ...d, clientSummary: e.target.value }))}
                rows={3}
              />
            </Field>
          </div>
        ) : compact ? (
          <dl className="space-y-1.5">
            <ViewRow label="Contact" value={savedProspect.contactName || "—"} compact />
            <ViewRow label="Email" value={savedProspect.contactEmail || "—"} compact />
          </dl>
        ) : (
          <dl className="space-y-3">
            <ViewRow label="Contact" value={savedProspect.contactName || "—"} />
            <ViewRow label="Email" value={savedProspect.contactEmail || "—"} />
            <ViewRow label="Phone" value={savedProspect.contactPhone || "—"} />
            <ViewRow label="Current manager" value={savedCurrentManager || "—"} />
            <ViewRow label="Lead assigned" value={assignedToName ?? "Unassigned"} />
            <ViewBlock label="Client summary" value={savedProspect.clientSummary} />
          </dl>
        )}
      </div>

      {(editing || !compact) && (
        <div className="space-y-2 border-t border-atlas-border p-3">
          {saveHint && (
            <p
              className={`text-center text-[9px] ${
                saveState === "error" ? "text-atlas-danger" : "text-atlas-muted"
              }`}
            >
              {saveHint}
            </p>
          )}
          {editing ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1 text-xs"
                onClick={cancelEdit}
                disabled={saveState === "saving"}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => void handleSave()}
                disabled={saveState === "saving"}
              >
                {saveState === "saving" ? "Saving…" : "Save"}
              </Button>
            </div>
          ) : (
            !embedded && (
              <Button type="button" variant="secondary" size="sm" className="w-full text-xs" onClick={startEdit}>
                {EDIT_PROSPECT}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}

function ViewRow({ label, value, compact }: { label: string; value: string; compact?: boolean }) {
  return (
    <div>
      <dt className={cn("uppercase tracking-wider text-atlas-muted", compact ? "text-[9px]" : "text-[10px]")}>
        {label}
      </dt>
      <dd className={cn("text-atlas-text", compact ? "text-[10px] truncate" : "mt-0.5")}>{value}</dd>
    </div>
  );
}

function ViewBlock({ label, value }: { label: string; value: string }) {
  const text = value?.trim();
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-atlas-muted">{label}</dt>
      <dd className="mt-0.5 line-clamp-4 text-atlas-muted">{text || "—"}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-atlas-muted">{label}</Label>
      {children}
    </div>
  );
}
