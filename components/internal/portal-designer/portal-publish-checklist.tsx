"use client";

import { Button } from "@/components/ui/button";
import type { BlockDiagnostic } from "@/lib/portal-block-diagnostics";
import {
  PORTAL_PUBLISH_STATUS_LABELS,
  type PortalPublishStatus,
} from "@/lib/portal-publish-status";

export function PortalPublishChecklist({
  open,
  onOpenChange,
  onConfirm,
  publishing,
  dirty,
  publishStatus,
  hiddenPageCount,
  diagnostics,
  proFormaVisible,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  publishing: boolean;
  dirty: boolean;
  publishStatus?: PortalPublishStatus;
  hiddenPageCount: number;
  diagnostics: BlockDiagnostic[];
  proFormaVisible: boolean;
}) {
  if (!open) return null;

  const hasWarnings =
    dirty ||
    publishStatus === "neverPublished" ||
    publishStatus === "unpublishedChanges" ||
    hiddenPageCount > 0 ||
    diagnostics.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-checklist-title"
        className="w-full max-w-md rounded-lg border border-atlas-border bg-atlas-surface p-5 shadow-xl"
      >
        <h2 id="publish-checklist-title" className="font-serif text-lg text-atlas-text">
          Publish checklist
        </h2>
        <p className="mt-1 text-xs text-atlas-muted">
          Review these items before publishing the prospect portal.
        </p>

        <ul className="mt-4 space-y-2 text-sm">
          <ChecklistItem
            status={dirty ? "warn" : "ok"}
            label={dirty ? "You have unsaved draft changes" : "Draft is saved"}
          />
          <ChecklistItem
            status={
              publishStatus === "neverPublished"
                ? "info"
                : publishStatus === "unpublishedChanges"
                  ? "warn"
                  : "ok"
            }
            label={
              publishStatus
                ? PORTAL_PUBLISH_STATUS_LABELS[publishStatus]
                : "Publish status unknown"
            }
          />
          {hiddenPageCount > 0 ? (
            <ChecklistItem
              status="warn"
              label={`${hiddenPageCount} page${hiddenPageCount === 1 ? "" : "s"} hidden from clients`}
            />
          ) : (
            <ChecklistItem status="ok" label="All designer pages are visible" />
          )}
          {diagnostics.length > 0 ? (
            <ChecklistItem
              status="warn"
              label={`${diagnostics.length} content warning${diagnostics.length === 1 ? "" : "s"} on this page`}
            />
          ) : (
            <ChecklistItem status="ok" label="No content warnings on active page" />
          )}
          <ChecklistItem
            status={proFormaVisible ? "info" : "ok"}
            label={
              proFormaVisible
                ? "Pro forma page is visible to clients"
                : "Pro forma page is hidden"
            }
          />
        </ul>

        {diagnostics.length > 0 ? (
          <div className="mt-3 max-h-32 overflow-y-auto rounded border border-atlas-border/60 bg-atlas-bg/40 p-2">
            <p className="text-[10px] font-medium text-atlas-muted">Warnings</p>
            <ul className="mt-1 space-y-0.5 text-[10px] text-amber-200/90">
              {diagnostics.slice(0, 8).map((d, i) => (
                <li key={`${d.blockId}-${d.kind}-${i}`}>{d.message}</li>
              ))}
              {diagnostics.length > 8 ? (
                <li>…and {diagnostics.length - 8} more</li>
              ) : null}
            </ul>
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={publishing} onClick={onConfirm}>
            {publishing
              ? "Publishing…"
              : hasWarnings
                ? "Publish anyway"
                : "Publish"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ChecklistItem({
  status,
  label,
}: {
  status: "ok" | "warn" | "info";
  label: string;
}) {
  const icon = status === "ok" ? "✓" : status === "warn" ? "!" : "i";
  const color =
    status === "ok"
      ? "text-emerald-400"
      : status === "warn"
        ? "text-amber-300"
        : "text-atlas-muted";

  return (
    <li className="flex items-start gap-2">
      <span className={`mt-0.5 text-xs font-bold ${color}`}>{icon}</span>
      <span className="text-atlas-text">{label}</span>
    </li>
  );
}
