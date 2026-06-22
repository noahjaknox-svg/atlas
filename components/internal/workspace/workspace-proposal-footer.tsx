"use client";

import { Button } from "@/components/ui/button";

export function WorkspaceProposalFooter({
  portalSlug,
  portalUrl,
  portalPin,
  portalActive,
  portalExists,
  publishLoading,
  needsRepublish,
  isAdmin,
  hasSelectedAircraft,
  onPreview,
  onPublish,
  onRepublish,
  onTakeDown,
  onRestorePortal,
  onRegeneratePin,
  onEditPresentation,
}: {
  portalSlug: string | null;
  portalUrl: string | null;
  portalPin: string | null;
  portalActive: boolean;
  portalExists: boolean;
  publishLoading: boolean;
  needsRepublish: boolean;
  isAdmin: boolean;
  hasSelectedAircraft: boolean;
  onPreview: () => void;
  onPublish: () => void;
  onRepublish: () => void;
  onTakeDown: () => void;
  onRestorePortal: () => void;
  onRegeneratePin: () => void;
  onEditPresentation: () => void;
}) {
  async function copyLink() {
    if (!portalUrl) return;
    try {
      await navigator.clipboard.writeText(portalUrl);
    } catch {
      alert(`Copy manually: ${portalUrl}`);
    }
  }

  const showPublish = isAdmin && !portalExists;
  const showRepublish = isAdmin && portalActive && needsRepublish;
  const upToDate = isAdmin && portalActive && !needsRepublish;
  const showTakeDown = isAdmin && portalActive;
  const showRestore = isAdmin && portalExists && !portalActive;

  return (
    <div className="shrink-0 border-t border-atlas-border bg-atlas-surface/40 px-4 py-2.5">
      <div className="flex items-center justify-center">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <p className="atlas-kicker shrink-0 whitespace-nowrap">Client portal</p>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0 text-xs"
            disabled={!hasSelectedAircraft}
            onClick={onEditPresentation}
          >
            Edit presentation
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0 text-xs"
            disabled={!portalSlug}
            onClick={onPreview}
            title="Preview the current draft as the client will see it"
          >
            Preview draft
          </Button>

          {showPublish ? (
            <Button
              type="button"
              size="sm"
              className="shrink-0 text-xs"
              disabled={publishLoading}
              onClick={onPublish}
            >
              {publishLoading ? "Publishing…" : "Publish proposal"}
            </Button>
          ) : null}

          {showRepublish ? (
            <Button
              type="button"
              size="sm"
              variant="default"
              className="shrink-0 text-xs ring-1 ring-atlas-accent/50"
              disabled={publishLoading}
              onClick={onRepublish}
            >
              {publishLoading ? "Updating…" : "Republish — data changed"}
            </Button>
          ) : null}

          {upToDate ? (
            <span className="shrink-0 whitespace-nowrap rounded border border-atlas-border/60 bg-atlas-bg/50 px-2 py-1 text-[10px] text-atlas-muted">
              Published — portal matches saved data
            </span>
          ) : null}

          {showRestore ? (
            <Button
              type="button"
              size="sm"
              variant="default"
              className="shrink-0 text-xs"
              disabled={publishLoading}
              onClick={onRestorePortal}
              title="Make this proposal viewable to the client again"
            >
              {publishLoading ? "Restoring…" : "Restore portal"}
            </Button>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-xs"
            disabled={!portalActive}
            onClick={() => void copyLink()}
          >
            Copy proposal link
          </Button>

          {portalPin ? (
            <span className="shrink-0 rounded border border-atlas-border bg-atlas-bg px-2 py-1 font-mono text-[10px] text-atlas-accent">
              {portalPin}
            </span>
          ) : null}

          <button
            type="button"
            title="Regenerate access code"
            disabled={!portalActive}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-atlas-border text-sm text-atlas-muted hover:border-atlas-accent hover:text-atlas-accent disabled:opacity-40"
            onClick={onRegeneratePin}
          >
            ↻
          </button>

          {showTakeDown ? (
            <button
              type="button"
              title="Take down — clients can no longer view this proposal"
              disabled={publishLoading}
              className="shrink-0 rounded border border-red-500/30 px-2 py-1 text-[10px] text-red-300/90 hover:border-red-500/60 hover:bg-red-500/10 disabled:opacity-40"
              onClick={onTakeDown}
            >
              Take down
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
