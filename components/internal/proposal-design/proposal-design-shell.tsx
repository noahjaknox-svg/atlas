"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ProposalDesignEditor } from "@/components/internal/proposal-design-editor";
import { ExperienceMasterEditor } from "@/components/internal/proposal-design/experience-master-editor";
import type { FleetShowcaseItem, PortalContentData } from "@/lib/portal-content";
import type { ExperienceMasterTemplate } from "@/lib/experience-master";

type Tab = "branding" | "report";

export function ProposalDesignShell({
  initialContent,
  initialFleet,
  initialTemplates,
}: {
  initialContent: PortalContentData;
  initialFleet: FleetShowcaseItem[];
  initialTemplates: ExperienceMasterTemplate[];
}) {
  const [tab, setTab] = useState<Tab>("report");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-4 border-b border-atlas-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-xl text-atlas-text">Proposal Design</h1>
          <p className="mt-0.5 text-xs text-atlas-muted">
            Master copy and branding for all client proposals
          </p>
        </div>
        <nav className="flex gap-1 rounded-lg border border-atlas-border p-1">
          <button
            type="button"
            onClick={() => setTab("report")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              tab === "report"
                ? "bg-atlas-accent/15 text-atlas-text"
                : "text-atlas-muted hover:text-atlas-text"
            )}
          >
            Report pages
          </button>
          <button
            type="button"
            onClick={() => setTab("branding")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              tab === "branding"
                ? "bg-atlas-accent/15 text-atlas-text"
                : "text-atlas-muted hover:text-atlas-text"
            )}
          >
            Global branding
          </button>
        </nav>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === "report" ? (
          <ExperienceMasterEditor initialTemplates={initialTemplates} />
        ) : (
          <div className="h-full overflow-y-auto px-4 py-6 lg:px-6">
            <p className="mb-6 max-w-2xl text-sm text-atlas-muted">
              PIN gate clouds, logo, About/Services/Fleet/Contact blocks used across all portals.
              Per-proposal report pages are edited under{" "}
              <button
                type="button"
                onClick={() => setTab("report")}
                className="text-atlas-accent hover:underline"
              >
                Report pages
              </button>
              ; individual proposals can override in{" "}
              <Link href="/pipeline" className="text-atlas-accent hover:underline">
                Design report
              </Link>
              .
            </p>
            <ProposalDesignEditor initialContent={initialContent} initialFleet={initialFleet} />
          </div>
        )}
      </div>
    </div>
  );
}
