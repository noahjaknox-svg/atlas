"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type PortalPresentationState = {
  clientSummary: string;
  portalImageUrl: string;
  portalVideoUrl: string;
  portalSpecHighlights: string[];
};

export function PortalPresentationForm({
  proposalId,
  aircraftId,
  initial,
  onSaved,
  className,
}: {
  proposalId: string;
  aircraftId: string;
  initial: PortalPresentationState;
  onSaved?: (next: PortalPresentationState) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/proposals/${proposalId}/aircraft/${aircraftId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientSummary: draft.clientSummary || null,
        portalImageUrl: draft.portalImageUrl || null,
        portalVideoUrl: draft.portalVideoUrl || null,
        portalSpecHighlights: draft.portalSpecHighlights.filter((s) => s.trim()),
      }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("Saved — visible in client portal after publish.");
      onSaved?.(draft);
    } else {
      setMessage("Could not save portal presentation.");
    }
  }

  function updateHighlight(index: number, value: string) {
    setDraft((d) => {
      const next = [...d.portalSpecHighlights];
      next[index] = value;
      return { ...d, portalSpecHighlights: next };
    });
  }

  return (
    <div className={cn(className)}>
      <p className="atlas-caption">
        Hero media and copy for this aircraft on the client portal. Republish to update live
        portals.
      </p>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="atlas-kicker">Client summary</span>
          <textarea
            value={draft.clientSummary}
            onChange={(e) => setDraft((d) => ({ ...d, clientSummary: e.target.value }))}
            rows={3}
            className="atlas-input mt-1 w-full"
            placeholder="Short overview shown on the aircraft detail page"
          />
        </label>
        <label className="block">
          <span className="atlas-kicker">Portal hero image URL</span>
          <input
            type="url"
            value={draft.portalImageUrl}
            onChange={(e) => setDraft((d) => ({ ...d, portalImageUrl: e.target.value }))}
            className="atlas-input mt-1 w-full"
            placeholder="https://…"
          />
        </label>
        <label className="block">
          <span className="atlas-kicker">Portal hero video URL</span>
          <input
            type="url"
            value={draft.portalVideoUrl}
            onChange={(e) => setDraft((d) => ({ ...d, portalVideoUrl: e.target.value }))}
            className="atlas-input mt-1 w-full"
            placeholder="https://… (optional)"
          />
        </label>
        <div>
          <span className="atlas-kicker">Spec highlights</span>
          <div className="mt-1 space-y-2">
            {draft.portalSpecHighlights.map((spec, i) => (
              <input
                key={i}
                type="text"
                value={spec}
                onChange={(e) => updateHighlight(i, e.target.value)}
                className="atlas-input w-full"
                placeholder="e.g. 8 passengers · 3,200 nm range"
              />
            ))}
            <button
              type="button"
              className="text-xs text-atlas-accent hover:underline"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  portalSpecHighlights: [...d.portalSpecHighlights, ""],
                }))
              }
            >
              + Add highlight
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="atlas-btn-primary text-xs"
        >
          {saving ? "Saving…" : "Save portal presentation"}
        </button>
        {message ? <span className="atlas-caption">{message}</span> : null}
      </div>
    </div>
  );
}

export function PortalPresentationPanel({
  proposalId,
  aircraftId,
  initial,
  onSaved,
}: {
  proposalId: string;
  aircraftId: string;
  initial: PortalPresentationState;
  onSaved?: (next: PortalPresentationState) => void;
}) {
  return (
    <div className="mt-4 rounded-md border border-atlas-border bg-atlas-surface/30 p-4">
      <p className="atlas-section-title text-sm">Client portal presentation</p>
      <PortalPresentationForm
        proposalId={proposalId}
        aircraftId={aircraftId}
        initial={initial}
        onSaved={onSaved}
      />
    </div>
  );
}
