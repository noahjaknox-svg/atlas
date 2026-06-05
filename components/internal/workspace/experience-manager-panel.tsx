"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { EXPERIENCE_SECTION_TYPES, EXPERIENCE_TAB_LABELS, SECTION_TYPE_TO_SLUG } from "@/lib/experience-content";
import type { ExperienceSectionType } from "@/lib/experience-content";

export type ExperienceSectionRow = {
  id: string;
  sectionType: string;
  title: string;
  bodyCopy: string | null;
  visible: boolean;
  sortOrder: number;
  imageUrl?: string | null;
  videoUrl?: string | null;
  posterUrl?: string | null;
  signatoryName?: string | null;
  signatoryTitle?: string | null;
};

export function ExperienceManagerPanel({
  proposalId,
  sections,
  onSectionsChange,
  portalSlug,
  needsRepublish,
  onSaved,
}: {
  proposalId: string;
  sections: ExperienceSectionRow[];
  onSectionsChange: (next: ExperienceSectionRow[]) => void;
  portalSlug?: string | null;
  needsRepublish?: boolean;
  onSaved?: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>("welcome");

  const experienceSections = sections
    .filter((s) =>
      EXPERIENCE_SECTION_TYPES.includes(s.sectionType as ExperienceSectionType)
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);

  async function save() {
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/proposals/${proposalId}/sections`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sections: experienceSections }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("Saved. Publish to update the client portal.");
      onSaved?.();
    } else {
      setMessage("Could not save experience pages.");
    }
  }

  function updateSection(index: number, patch: Partial<ExperienceSectionRow>) {
    const globalIndex = sections.findIndex((s) => s.id === experienceSections[index]!.id);
    if (globalIndex < 0) return;
    const next = [...sections];
    next[globalIndex] = { ...next[globalIndex]!, ...patch };
    onSectionsChange(next);
  }

  return (
    <CollapsibleSection title="Client experience" defaultOpen>
      <p className="mb-2 text-[10px] leading-relaxed text-atlas-muted">
        Toggle pages, edit copy and hero images. Clients see changes after publish.
      </p>
      {needsRepublish ? (
        <p className="mb-2 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200/90">
          Unpublished changes — republish to update the live portal.
        </p>
      ) : null}

      <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
        {experienceSections.map((sec, index) => {
          const label =
            EXPERIENCE_TAB_LABELS[sec.sectionType as ExperienceSectionType] ?? sec.title;
          const isOpen = expanded === sec.sectionType;
          return (
            <div
              key={sec.id}
              className="rounded border border-atlas-border/50 bg-atlas-bg/60"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left"
                onClick={() => setExpanded(isOpen ? null : sec.sectionType)}
              >
                <span className="text-[10px] font-medium text-atlas-text">{label}</span>
                <label
                  className="flex items-center gap-1 text-[9px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={sec.visible}
                    onChange={(e) => updateSection(index, { visible: e.target.checked })}
                    className="accent-atlas-accent"
                  />
                  On
                </label>
              </button>
              {isOpen ? (
                <div className="space-y-1.5 border-t border-atlas-border/40 p-2">
                  <Input
                    value={sec.title}
                    onChange={(e) => updateSection(index, { title: e.target.value })}
                    className="h-7 text-xs"
                    placeholder="Title"
                  />
                  <textarea
                    value={sec.bodyCopy ?? ""}
                    onChange={(e) => updateSection(index, { bodyCopy: e.target.value })}
                    rows={3}
                    className="w-full rounded border border-atlas-border/80 bg-atlas-bg px-2 py-1 text-xs"
                    placeholder="Body copy — use {contactName} on Welcome"
                  />
                  <Input
                    value={sec.imageUrl ?? ""}
                    onChange={(e) =>
                      updateSection(index, { imageUrl: e.target.value || null })
                    }
                    className="h-7 text-xs"
                    placeholder="Hero image URL"
                  />
                  {sec.sectionType === "welcome" ? (
                    <>
                      <Input
                        value={sec.signatoryName ?? ""}
                        onChange={(e) =>
                          updateSection(index, { signatoryName: e.target.value || null })
                        }
                        className="h-7 text-xs"
                        placeholder="Signatory name"
                      />
                      <Input
                        value={sec.signatoryTitle ?? ""}
                        onChange={(e) =>
                          updateSection(index, { signatoryTitle: e.target.value || null })
                        }
                        className="h-7 text-xs"
                        placeholder="Signatory title"
                      />
                    </>
                  ) : null}
                  {portalSlug && sec.visible ? (
                    <a
                      href={`/${portalSlug}/experience/${SECTION_TYPE_TO_SLUG[sec.sectionType as ExperienceSectionType] ?? sec.sectionType}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-atlas-accent hover:underline"
                    >
                      Preview (published)
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        size="sm"
        className="mt-2 w-full text-xs"
        disabled={saving}
        onClick={() => void save()}
      >
        {saving ? "Saving…" : "Save experience pages"}
      </Button>
      {message ? <p className="mt-1 text-[10px] text-atlas-muted">{message}</p> : null}
    </CollapsibleSection>
  );
}
