"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  CLIENT_EDITABLE_ASSUMPTIONS,
  type WorkspaceFormState,
} from "@/lib/workspace-sections";
import { ROUTES } from "@/lib/routes";

type ScenarioSummary = {
  netAnnualCost: string | number | null;
  netMonthlyCost: string | number | null;
  costPerOwnerHour: string | number | null;
  ownerHours: string | number | null;
};

export function WorkspaceSidebar({
  proposalId,
  completenessPercent,
  missingRequired,
  formState,
  clientEditable,
  onClientEditableChange,
  scenario,
  portalSlug,
  portalUrl,
  isAdmin,
  saveStatus,
  onRecalculate,
  onPublish,
}: {
  proposalId: string;
  completenessPercent: number;
  missingRequired: string[];
  formState: WorkspaceFormState;
  clientEditable: Record<string, boolean>;
  onClientEditableChange: (name: string, value: boolean) => void;
  scenario: ScenarioSummary | null;
  portalSlug: string | null;
  portalUrl: string | null;
  isAdmin: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  onRecalculate: () => void;
  onPublish: () => Promise<{ portalUrl: string; pin: string } | null>;
}) {
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishResult, setPublishResult] = useState<{ portalUrl: string; pin: string } | null>(
    null
  );

  async function handlePublish() {
    setPublishLoading(true);
    try {
      const result = await onPublish();
      if (result) setPublishResult(result);
    } finally {
      setPublishLoading(false);
    }
  }

  const saveLabel =
    saveStatus === "saving"
      ? "Saving…"
      : saveStatus === "saved"
        ? "All changes saved"
        : saveStatus === "error"
          ? "Save failed"
          : "Autosave on";

  return (
    <aside className="sticky top-0 flex h-[calc(100vh-4.5rem)] w-[320px] shrink-0 flex-col border-l border-atlas-border bg-atlas-bg/95 backdrop-blur">
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-atlas-muted">Completeness</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl tabular-nums text-atlas-accent">
              {completenessPercent}%
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-atlas-border">
            <div
              className="h-full bg-atlas-accent transition-all duration-300"
              style={{ width: `${completenessPercent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-atlas-muted">{saveLabel}</p>
        </div>

        {missingRequired.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-atlas-muted">Missing required</p>
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-atlas-danger">
              {missingRequired.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="text-xs uppercase tracking-wider text-atlas-muted">Quick summary</p>
          <dl className="mt-2 space-y-2 font-mono text-sm tabular-nums">
            <div>
              <dt className="text-atlas-muted">Prospect</dt>
              <dd>{formState.prospect.prospectName || "—"}</dd>
            </div>
            <div>
              <dt className="text-atlas-muted">Aircraft</dt>
              <dd>{formState.assumptions.aircraft_model || "—"}</dd>
            </div>
            <div>
              <dt className="text-atlas-muted">Net annual</dt>
              <dd className="text-atlas-accent">
                {formatCurrency(
                  scenario?.netAnnualCost != null ? Number(scenario.netAnnualCost) : null
                )}
              </dd>
            </div>
            <div>
              <dt className="text-atlas-muted">$/owner hr</dt>
              <dd>
                {formatCurrency(
                  scenario?.costPerOwnerHour != null
                    ? Number(scenario.costPerOwnerHour)
                    : null
                )}
              </dd>
            </div>
          </dl>
          <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={onRecalculate}>
            Recalculate pro forma
          </Button>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-atlas-muted">
            Client-editable assumptions
          </p>
          <p className="mt-1 text-xs text-atlas-muted">
            Allow the client to adjust these on the portal.
          </p>
          <ul className="mt-3 space-y-2">
            {CLIENT_EDITABLE_ASSUMPTIONS.map((item) => (
              <li key={item.name} className="flex items-center justify-between gap-2 text-sm">
                <span>{item.label}</span>
                <input
                  type="checkbox"
                  checked={clientEditable[item.name] ?? false}
                  onChange={(e) => onClientEditableChange(item.name, e.target.checked)}
                  className="h-4 w-4 rounded border-atlas-border accent-atlas-accent"
                />
              </li>
            ))}
          </ul>
        </div>

        {publishResult && (
          <div className="rounded-md border border-atlas-accent/30 bg-atlas-surface p-3 text-xs font-mono">
            <p className="text-atlas-success">Published</p>
            <p className="mt-1 break-all text-atlas-accent">{publishResult.portalUrl}</p>
            <p className="mt-1 text-atlas-danger">PIN: {publishResult.pin}</p>
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-atlas-border p-5">
        {portalSlug && (
          <Link href={`/${portalSlug}/experience/welcome`} target="_blank" className="block">
            <Button variant="secondary" className="w-full">
              Preview proposal
            </Button>
          </Link>
        )}
        {!portalSlug && (
          <Button variant="secondary" className="w-full" disabled>
            Preview (publish first)
          </Button>
        )}
        {isAdmin && (
          <Button className="w-full" onClick={handlePublish} disabled={publishLoading}>
            {publishLoading ? "Publishing…" : "Publish"}
          </Button>
        )}
        {portalUrl && portalSlug && (
          <Link href={`/${portalSlug}/experience/welcome`} target="_blank" className="block">
            <Button variant="ghost" className="w-full">
              Client portal
            </Button>
          </Link>
        )}
        <Link href={ROUTES.aircraftManagement.pipeline}>
          <Button variant="ghost" className="w-full">
            Back to pipeline
          </Button>
        </Link>
      </div>
    </aside>
  );
}
