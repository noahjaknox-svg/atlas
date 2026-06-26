"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import {
  OPEN_PROSPECT_PORTAL,
  PREVIEW_PROSPECT_PORTAL,
  PUBLISH_PROSPECT_PORTAL,
} from "@/lib/product-terminology";

export function WorkspaceTopBar({
  saveLabel,
  portalSlug,
  isAdmin,
  publishLoading,
  onPreview,
  onPublish,
  onClientPortal,
}: {
  saveLabel: string;
  portalSlug: string | null;
  isAdmin: boolean;
  publishLoading: boolean;
  onPreview: () => void;
  onPublish: () => void;
  onClientPortal: () => void;
}) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-atlas-border bg-atlas-bg/95 px-4 py-2.5 backdrop-blur">
      <div className="flex items-center gap-4">
        <Link
          href={ROUTES.aircraftManagement.pipeline}
          className="text-xs text-atlas-muted transition-colors hover:text-atlas-accent"
        >
          ← Back to Pipeline
        </Link>
        <span className="text-xs text-atlas-muted">{saveLabel}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!portalSlug}
          onClick={onPreview}
        >
          {PREVIEW_PROSPECT_PORTAL}
        </Button>
        {isAdmin && (
          <Button type="button" size="sm" disabled={publishLoading} onClick={onPublish}>
            {publishLoading ? "Publishing…" : PUBLISH_PROSPECT_PORTAL}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!portalSlug}
          onClick={onClientPortal}
        >
          {OPEN_PROSPECT_PORTAL}
        </Button>
      </div>
    </header>
  );
}
