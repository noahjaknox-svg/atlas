"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { BADGE_STYLES } from "@/lib/pipeline";
import { prefetchProposalRoute } from "@/lib/prefetch-proposal-route";
import { ROUTES } from "@/lib/routes";
import {
  OPEN_PROSPECT_PORTAL,
  OPEN_PROPOSAL_WORKSPACE,
  PREVIEW_PROSPECT_PORTAL,
  PROPOSAL_WORKSPACE,
  PUBLISH_PROSPECT_PORTAL,
} from "@/lib/product-terminology";
import { cn } from "@/lib/utils";
import type { PipelineCardData } from "@/components/internal/pipeline-card";

type AtlasUser = { id: string; name: string };

interface ProposalDetail {
  id: string;
  proposalName: string;
  status: string;
  pipelineStage: string;
  isParked: boolean;
  updatedAt: string;
  createdAt: string;
  internalNotes: string | null;
  prospect: {
    id: string;
    prospectName: string;
    companyName: string | null;
    contactName: string;
    contactEmail: string;
    contactPhone: string | null;
    assignedToId: string | null;
  };
  clientPortal: {
    slug: string;
    active: boolean;
    viewCount: number;
    portalUrl?: string;
    pin?: string | null;
  } | null;
  snapshots: Array<{ publishedAt: string; versionNumber: number }>;
}

export function ProposalDetailPanel({
  proposalId,
  initialCard,
  open,
  onOpenChange,
  onUpdated,
  atlasUsers,
}: {
  proposalId: string | null;
  initialCard?: PipelineCardData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
  atlasUsers: AtlasUser[];
}) {
  const router = useRouter();
  const [data, setData] = useState<ProposalDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open || !proposalId) {
      setData(null);
      return;
    }

    prefetchProposalRoute(router, proposalId);

    setLoading(true);
    setError("");
    fetch(`/api/proposals/${proposalId}/summary`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load");
        setData(json);
        setNotes(json.internalNotes ?? "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [open, proposalId, router]);

  const showShell = !data && initialCard && loading;

  async function saveNotes(value: string) {
    if (!data) return;
    setNotesSaving(true);
    const res = await fetch(`/api/proposals/${data.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ internalNotes: value }),
    });
    setNotesSaving(false);
    if (res.ok) onUpdated?.();
  }

  function handleNotesChange(value: string) {
    setNotes(value);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => void saveNotes(value), 800);
  }

  async function updateAssignee(assignedToId: string | null) {
    if (!data) return;
    const res = await fetch(`/api/proposals/${data.id}/prospect`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId }),
    });
    if (res.ok) {
      const json = await res.json();
      setData((d) =>
        d
          ? {
              ...d,
              prospect: {
                ...d.prospect,
                assignedToId: json.assignedToId ?? assignedToId,
              },
            }
          : d
      );
      onUpdated?.();
    }
  }

  async function toggleParked() {
    if (!data) return;
    const res = await fetch(`/api/proposals/${data.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isParked: !data.isParked }),
    });
    if (res.ok) {
      const updated = await res.json();
      setData((d) => (d ? { ...d, isParked: updated.isParked } : d));
      onUpdated?.();
    }
  }

  async function handlePublish() {
    if (!data) return;
    setPublishLoading(true);
    try {
      const res = await fetch(`/api/proposals/${data.id}/publish`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error ?? "Publish failed");
        return;
      }
      setData((d) =>
        d
          ? {
              ...d,
              clientPortal: {
                slug: json.slug,
                active: true,
                viewCount: d.clientPortal?.viewCount ?? 0,
                portalUrl: json.portalUrl,
                pin: json.pin,
              },
            }
          : d
      );
      if (json.pin) alert(`Published. PIN: ${json.pin}`);
      onUpdated?.();
    } finally {
      setPublishLoading(false);
    }
  }

  async function setStatus(status: string) {
    if (!data) return;
    const res = await fetch(`/api/proposals/${data.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        ...(status === "won" || status === "lost" ? { pipelineStage: "closed" } : {}),
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setData((d) =>
        d ? { ...d, status: updated.status, pipelineStage: updated.pipelineStage } : d
      );
      onUpdated?.();
    }
  }

  async function handleArchive() {
    if (!data) return;
    const name = data.prospect.prospectName;
    if (
      !confirm(
        `Archive ${name}? This removes the deal from the pipeline and deactivates the prospect portal.`
      )
    ) {
      return;
    }
    setArchiveLoading(true);
    try {
      const res = await fetch(`/api/proposals/${data.id}/archive`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error ?? "Archive failed");
        return;
      }
      onOpenChange(false);
      onUpdated?.();
      router.push(ROUTES.aircraftManagement.pipeline);
      router.refresh();
    } finally {
      setArchiveLoading(false);
    }
  }

  const lastPublished = data?.snapshots?.[0];
  const portalActive = data?.clientPortal?.active;

  const activityItems = data
    ? [
        { label: "Created", at: data.createdAt },
        ...(lastPublished
          ? [{ label: `Published v${lastPublished.versionNumber}`, at: lastPublished.publishedAt }]
          : []),
        ...(data.clientPortal && data.clientPortal.viewCount > 0
          ? [{ label: `Client viewed (${data.clientPortal.viewCount})`, at: data.updatedAt }]
          : []),
        { label: `Status: ${data.status.replace(/_/g, " ")}`, at: data.updatedAt },
      ]
    : [];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-atlas-border bg-atlas-surface shadow-2xl focus:outline-none">
          <div className="flex items-center justify-between border-b border-atlas-border px-5 py-3">
            <Dialog.Title className="font-serif text-lg">
              {data?.prospect.prospectName ?? initialCard?.prospectName ?? "Proposal"}
            </Dialog.Title>
            <Dialog.Close className="text-atlas-muted hover:text-atlas-text">✕</Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {loading && !showShell && (
              <p className="text-sm text-atlas-muted">Loading…</p>
            )}
            {error && <p className="text-sm text-atlas-danger">{error}</p>}
            {showShell && initialCard && (
              <div className="space-y-5 animate-pulse">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={initialCard.status} />
                  {initialCard.isParked && (
                    <span className="rounded-full bg-atlas-border px-2 py-0.5 text-[10px] text-atlas-muted">
                      Parked
                    </span>
                  )}
                </div>
                {initialCard.subtitle && (
                  <p className="text-sm text-atlas-muted">{initialCard.subtitle}</p>
                )}
                <p className="text-xs text-atlas-muted">
                  Assignee: {initialCard.assigneeName ?? "Unassigned"}
                </p>
                {initialCard.badges.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {initialCard.badges.map((badge) => (
                      <span
                        key={badge.id}
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                          BADGE_STYLES[badge.id]
                        )}
                      >
                        {badge.label}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-sm text-atlas-muted">Loading details…</p>
              </div>
            )}
            {data && !loading && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={data.status} />
                  {data.isParked && (
                    <span className="rounded-full bg-atlas-border px-2 py-0.5 text-[10px] text-atlas-muted">
                      Parked
                    </span>
                  )}
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <dt className="text-[10px] uppercase text-atlas-muted">Contact</dt>
                    <dd>{data.prospect.contactName}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase text-atlas-muted">Email</dt>
                    <dd className="text-atlas-accent">{data.prospect.contactEmail}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[10px] uppercase text-atlas-muted">Assigned to</dt>
                    <dd className="mt-1">
                      <select
                        value={data.prospect.assignedToId ?? ""}
                        onChange={(e) =>
                          updateAssignee(e.target.value ? e.target.value : null)
                        }
                        className="h-8 w-full rounded border border-atlas-border bg-atlas-bg px-2 text-xs"
                      >
                        <option value="">Unassigned</option>
                        {atlasUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </dd>
                  </div>
                </dl>

                <div>
                  <p className="text-[10px] uppercase text-atlas-muted">Prospect portal</p>
                  {portalActive ? (
                    <p className="mt-1 font-mono text-xs text-atlas-success">
                      Live · /{data.clientPortal!.slug}
                      {data.clientPortal!.pin ? ` · PIN ${data.clientPortal!.pin}` : ""}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-atlas-muted">Not published</p>
                  )}
                </div>

                <div>
                  <label className="text-[10px] uppercase text-atlas-muted">
                    Internal notes
                    {notesSaving && <span className="ml-2 normal-case">Saving…</span>}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    rows={5}
                    className="mt-1 w-full rounded border border-atlas-border bg-atlas-bg px-3 py-2 text-sm"
                    placeholder="Comments and context for the team…"
                  />
                  <p className="mt-1 text-[10px] text-atlas-muted">
                    Same notes appear in the {PROPOSAL_WORKSPACE}.
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase text-atlas-muted">Activity</p>
                  <ul className="mt-2 space-y-1.5 text-xs">
                    {activityItems.map((item, i) => (
                      <li key={i} className="flex justify-between gap-4">
                        <span>{item.label}</span>
                        <span className="shrink-0 text-atlas-muted">
                          {formatDistanceToNow(new Date(item.at), { addSuffix: true })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {(data || (showShell && initialCard)) && (
            <div className="space-y-2 border-t border-atlas-border px-5 py-3">
              <div className="flex flex-wrap gap-2">
                <Link
                  href={ROUTES.aircraftManagement.proposal(data?.id ?? initialCard!.id)}
                  prefetch
                  className="min-w-[120px] flex-1"
                >
                  <Button className="w-full text-xs">{OPEN_PROPOSAL_WORKSPACE}</Button>
                </Link>
                {data ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="text-xs"
                      disabled={!portalActive}
                      onClick={() =>
                        portalActive &&
                        window.open(`/${data.clientPortal!.slug}/experience/welcome`, "_blank")
                      }
                    >
                      {PREVIEW_PROSPECT_PORTAL}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="text-xs"
                      disabled={publishLoading}
                      onClick={() => void handlePublish()}
                    >
                      {publishLoading ? "…" : PUBLISH_PROSPECT_PORTAL}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      disabled={!data.clientPortal?.portalUrl}
                      onClick={() =>
                        data.clientPortal?.portalUrl &&
                        window.open(data.clientPortal.portalUrl, "_blank")
                      }
                    >
                      {OPEN_PROSPECT_PORTAL}
                    </Button>
                  </>
                ) : null}
              </div>
              {data ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" className="text-xs" onClick={toggleParked}>
                  {data.isParked ? "Unpark" : "Park"}
                </Button>
                <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => setStatus("won")}>
                  Mark won
                </Button>
                <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => setStatus("lost")}>
                  Mark lost
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-atlas-muted hover:text-atlas-danger"
                  disabled={archiveLoading}
                  onClick={() => void handleArchive()}
                >
                  {archiveLoading ? "Archiving…" : "Archive"}
                </Button>
              </div>
              ) : null}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
