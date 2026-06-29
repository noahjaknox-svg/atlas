"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  COPY_PROSPECT_PORTAL_LINK,
  EDIT_PROSPECT_PORTAL,
  OPEN_PORTAL_DESIGNER,
  PREVIEW_PROSPECT_PORTAL,
  PUBLISH_PROSPECT_PORTAL,
  PUBLISHED_LAST_LABEL,
  REPUBLISH_PROSPECT_PORTAL,
} from "@/lib/product-terminology";

export function WorkspaceProposalFooter({
  portalSlug,
  portalUrl,
  portalPin,
  portalActive,
  publishLoading,
  needsRepublish,
  lastPublishedAt,
  isAdmin,
  hasSelectedAircraft,
  previewLoading = false,
  previewDisabled = false,
  previewDisabledReason,
  onPreview,
  onPublish,
  onTakeDown,
  onRestorePortal,
  onRegeneratePin,
  onEditPresentation,
  onOpenDesigner,
}: {
  portalSlug: string | null;
  portalUrl: string | null;
  portalPin: string | null;
  portalActive: boolean;
  publishLoading: boolean;
  needsRepublish: boolean;
  lastPublishedAt: string | null;
  isAdmin: boolean;
  hasSelectedAircraft: boolean;
  previewLoading?: boolean;
  previewDisabled?: boolean;
  previewDisabledReason?: string;
  onPreview: () => void;
  /** Pass true to republish an active portal; false for first publish or re-activate. */
  onPublish: (republish: boolean) => void;
  onTakeDown: () => void;
  onRestorePortal: () => void;
  onRegeneratePin: () => void;
  onEditPresentation: () => void;
  onOpenDesigner: () => void;
}) {
  async function copyLink() {
    if (!portalUrl) return;
    try {
      await navigator.clipboard.writeText(portalUrl);
    } catch {
      alert(`Copy manually: ${portalUrl}`);
    }
  }

  const publishedLabel = lastPublishedAt
    ? format(new Date(lastPublishedAt), "MMM d, yyyy 'at' h:mm a")
    : "Never";

  const publishDisabled =
    publishLoading ||
    (portalActive && !needsRepublish) ||
    (!portalActive && !!portalPin && !needsRepublish);

  const showTakeDown = isAdmin && portalActive;
  const showRestore = isAdmin && !portalActive && !!portalPin;
  const previewBlocked = previewDisabled || previewLoading;

  return (
    <div className="shrink-0 border-t border-atlas-border bg-atlas-chrome/95 px-4 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0 text-xs"
            disabled={!hasSelectedAircraft}
            onClick={onEditPresentation}
          >
            {EDIT_PROSPECT_PORTAL}
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0 text-xs"
            disabled={!hasSelectedAircraft}
            onClick={onOpenDesigner}
          >
            {OPEN_PORTAL_DESIGNER}
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0 text-xs"
            disabled={previewBlocked}
            onClick={onPreview}
            title={
              previewDisabledReason ??
              "Preview the current draft as the client will see it"
            }
          >
            {previewLoading ? "Opening preview…" : PREVIEW_PROSPECT_PORTAL}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {showTakeDown ? (
            <button
              type="button"
              title="Take down — clients can no longer view this proposal"
              disabled={publishLoading}
              className="shrink-0 rounded border border-red-500/30 px-2.5 py-1.5 text-xs text-red-300/90 hover:border-red-500/60 hover:bg-red-500/10 disabled:opacity-40"
              onClick={onTakeDown}
            >
              Take down
            </button>
          ) : null}

          {showRestore ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="shrink-0 text-xs"
              disabled={publishLoading}
              onClick={onRestorePortal}
              title="Make this proposal viewable to the client again"
            >
              {publishLoading ? "Restoring…" : "Restore portal"}
            </Button>
          ) : null}

          {portalPin ? (
            <span className="shrink-0 rounded border border-atlas-border bg-atlas-bg px-2 py-1 font-mono text-[10px] text-atlas-accent">
              {portalPin}
            </span>
          ) : null}

          <button
            type="button"
            title="Regenerate access code"
            disabled={!portalActive || publishLoading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-atlas-border text-sm text-atlas-muted hover:border-atlas-accent hover:text-atlas-accent disabled:opacity-40"
            onClick={onRegeneratePin}
          >
            ↻
          </button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-xs"
            disabled={!portalActive}
            onClick={() => void copyLink()}
          >
            {COPY_PROSPECT_PORTAL_LINK}
          </Button>

          <span className="mx-1 hidden h-5 w-px shrink-0 bg-atlas-border/80 sm:inline-block" aria-hidden />

          <span className="shrink-0 whitespace-nowrap text-xs text-atlas-muted">
            {PUBLISHED_LAST_LABEL}{" "}
            <span className="text-atlas-text">{publishedLabel}</span>
          </span>

          {isAdmin ? (
            <Button
              type="button"
              size="sm"
              className="shrink-0 text-xs"
              disabled={publishDisabled}
              onClick={() => onPublish(!!portalPin)}
            >
              {publishLoading
                ? "Publishing…"
                : portalPin
                  ? REPUBLISH_PROSPECT_PORTAL
                  : PUBLISH_PROSPECT_PORTAL}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
