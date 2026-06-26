"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import {
  PROSPECT_PORTAL_HERO_SAVE_ERROR,
  PROSPECT_PORTAL_HERO_SAVED_MESSAGE,
  PROSPECT_PORTAL_HERO_SECTION,
  SAVE_PROSPECT_PORTAL_CHANGES,
} from "@/lib/product-terminology";

export type PortalPresentationState = {
  clientSummary: string;
  portalImageUrl: string;
  portalVideoUrl: string;
  portalSpecHighlights: string[];
};

type PortalPresentationFormProps = {
  className?: string;
} & (
  | {
      value: PortalPresentationState;
      onChange: (next: PortalPresentationState) => void;
      proposalId?: never;
      aircraftId?: never;
      initial?: never;
      onSaved?: never;
    }
  | {
      value?: never;
      onChange?: never;
      proposalId: string;
      aircraftId: string;
      initial: PortalPresentationState;
      onSaved?: (next: PortalPresentationState) => void;
    }
);

export function PortalPresentationForm(props: PortalPresentationFormProps) {
  const { className } = props;
  const isControlled = "value" in props && props.value !== undefined;

  const [internalDraft, setInternalDraft] = useState(
    isControlled ? props.value! : props.initial
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const draft = isControlled ? props.value! : internalDraft;
  const setDraft = isControlled ? props.onChange! : setInternalDraft;

  useEffect(() => {
    if (!isControlled) {
      setInternalDraft(props.initial);
    }
  }, [isControlled, props.initial]);

  async function save() {
    if (isControlled || !props.proposalId) return;

    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/proposals/${props.proposalId}/aircraft/${props.aircraftId}`, {
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
      setMessage(PROSPECT_PORTAL_HERO_SAVED_MESSAGE);
      props.onSaved?.(draft);
    } else {
      setMessage(PROSPECT_PORTAL_HERO_SAVE_ERROR);
    }
  }

  function updateHighlight(index: number, value: string) {
    const next = [...draft.portalSpecHighlights];
    next[index] = value;
    setDraft({ ...draft, portalSpecHighlights: next });
  }

  return (
    <div className={cn(className)}>
      {!isControlled ? (
        <p className="atlas-caption">
          Hero media and copy for this aircraft on the prospect portal. Republish to update live
          portals.
        </p>
      ) : null}

      <div className={cn(!isControlled && "mt-4", "space-y-3")}>
        <label className="block">
          <span className="atlas-kicker">Client summary</span>
          <AutoResizeTextarea
            value={draft.clientSummary}
            onChange={(clientSummary) => setDraft({ ...draft, clientSummary })}
            minRows={2}
            className="atlas-input mt-1 w-full"
            placeholder="Short overview shown on the aircraft detail page"
          />
        </label>
        <label className="block">
          <span className="atlas-kicker">Portal hero image URL</span>
          <input
            type="url"
            value={draft.portalImageUrl}
            onChange={(e) => setDraft({ ...draft, portalImageUrl: e.target.value })}
            className="atlas-input mt-1 w-full"
            placeholder="https://…"
          />
        </label>
        <label className="block">
          <span className="atlas-kicker">Portal hero video URL</span>
          <input
            type="url"
            value={draft.portalVideoUrl}
            onChange={(e) => setDraft({ ...draft, portalVideoUrl: e.target.value })}
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
                setDraft({
                  ...draft,
                  portalSpecHighlights: [...draft.portalSpecHighlights, ""],
                })
              }
            >
              + Add highlight
            </button>
          </div>
        </div>
      </div>

      {!isControlled ? (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="atlas-btn-primary text-xs"
          >
            {saving ? "Saving…" : SAVE_PROSPECT_PORTAL_CHANGES}
          </button>
          {message ? <span className="atlas-caption">{message}</span> : null}
        </div>
      ) : null}
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
      <p className="atlas-section-title text-sm">{PROSPECT_PORTAL_HERO_SECTION}</p>
      <PortalPresentationForm
        proposalId={proposalId}
        aircraftId={aircraftId}
        initial={initial}
        onSaved={onSaved}
      />
    </div>
  );
}
