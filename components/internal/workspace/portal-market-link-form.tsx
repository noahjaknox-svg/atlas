"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ExperienceContentBlocks } from "@/lib/experience-content";
import type { ExperienceSectionRow } from "@/components/internal/workspace/experience-manager-panel";

const DEFAULT_LABEL = "Available aircraft";

function normalizeMarketUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}

export function PortalMarketLinkForm({
  proposalId,
  sections,
  onSectionsChange,
  onSaved,
}: {
  proposalId: string;
  sections: ExperienceSectionRow[];
  onSectionsChange: (next: ExperienceSectionRow[]) => void;
  onSaved?: () => void;
}) {
  const welcomeIndex = sections.findIndex((s) => s.sectionType === "welcome");
  const welcome = welcomeIndex >= 0 ? sections[welcomeIndex]! : null;
  const blocks = (welcome?.contentBlocks ?? {}) as ExperienceContentBlocks;

  const [label, setLabel] = useState(blocks.aircraftMarketButtonLabel ?? DEFAULT_LABEL);
  const [url, setUrl] = useState(blocks.aircraftMarketUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLabel(blocks.aircraftMarketButtonLabel ?? DEFAULT_LABEL);
    setUrl(blocks.aircraftMarketUrl ?? "");
  }, [welcome?.id, blocks.aircraftMarketButtonLabel, blocks.aircraftMarketUrl]);

  async function save() {
    if (welcomeIndex < 0 || !welcome) {
      setError("Welcome section not found.");
      return;
    }

    const normalizedUrl = url.trim() ? normalizeMarketUrl(url) : null;
    if (url.trim() && !normalizedUrl) {
      setError("Enter a valid URL (e.g. https://example.com/market).");
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    const nextBlocks: ExperienceContentBlocks = {
      ...(welcome.contentBlocks as ExperienceContentBlocks | null),
      aircraftMarketUrl: normalizedUrl,
      aircraftMarketButtonLabel: label.trim() || DEFAULT_LABEL,
    };

    const res = await fetch(`/api/proposals/${proposalId}/sections`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sections: [
          {
            id: welcome.id,
            contentBlocks: nextBlocks,
          },
        ],
      }),
    });

    setSaving(false);

    if (res.ok) {
      const next = [...sections];
      next[welcomeIndex] = {
        ...welcome,
        contentBlocks: nextBlocks as ExperienceSectionRow["contentBlocks"],
      };
      onSectionsChange(next);
      if (normalizedUrl) setUrl(normalizedUrl);
      setMessage("Saved. Publish to update the client portal header.");
      onSaved?.();
    } else {
      setError("Could not save market link.");
    }
  }

  if (!welcome) {
    return (
      <p className="text-xs text-atlas-muted">
        Welcome section missing — open the proposal workspace after experience sections are created.
      </p>
    );
  }

  return (
    <div>
      <p className="text-xs leading-relaxed text-atlas-muted">
        Optional button in the portal header, to the right of Pro Forma. Opens in a new tab.
      </p>
      <div className="mt-3 space-y-3">
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-atlas-muted">
            Button label
          </span>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="mt-1 h-8 text-xs"
            placeholder={DEFAULT_LABEL}
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-atlas-muted">
            Market URL
          </span>
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-1 h-8 text-xs"
            placeholder="https://…"
          />
        </label>
      </div>
      <Button
        type="button"
        size="sm"
        className="mt-3 w-full text-xs"
        disabled={saving}
        onClick={() => void save()}
      >
        {saving ? "Saving…" : "Save portal link"}
      </Button>
      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
      {message ? <p className="mt-2 text-xs text-atlas-muted">{message}</p> : null}
    </div>
  );
}
