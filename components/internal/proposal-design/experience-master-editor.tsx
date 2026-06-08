"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaUploadField } from "@/components/internal/media-upload-field";
import { GalleryEditor } from "@/components/internal/gallery-editor";
import {
  EXPERIENCE_SECTION_TYPES,
  EXPERIENCE_TAB_LABELS,
} from "@/lib/experience-content";
import type {
  ExperienceContentBlocks,
  ExperienceGalleryItem,
  ExperienceSectionType,
} from "@/lib/experience-content";
import type { ExperienceMasterTemplate } from "@/lib/experience-master";
import { cn } from "@/lib/utils";

const NO_MEDIA_TYPES = new Set(["disclaimer"]);

/** Edit master report page copy + media at /proposal-design — seeds all new proposals. */
export function ExperienceMasterEditor({
  initialTemplates,
}: {
  initialTemplates: ExperienceMasterTemplate[];
}) {
  const sorted = useMemo(
    () =>
      [...initialTemplates].sort((a, b) => {
        const ai = EXPERIENCE_SECTION_TYPES.indexOf(a.sectionType as ExperienceSectionType);
        const bi = EXPERIENCE_SECTION_TYPES.indexOf(b.sectionType as ExperienceSectionType);
        return (ai >= 0 ? ai : a.sortOrder) - (bi >= 0 ? bi : b.sortOrder);
      }),
    [initialTemplates]
  );

  const [templates, setTemplates] = useState<ExperienceMasterTemplate[]>(sorted);
  const [activeType, setActiveType] = useState<string>(sorted[0]?.sectionType ?? "welcome");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const active = templates.find((t) => t.sectionType === activeType) ?? templates[0];

  function patchActive(patch: Partial<ExperienceMasterTemplate>) {
    setTemplates((prev) =>
      prev.map((t) => (t.sectionType === activeType ? { ...t, ...patch } : t))
    );
    setDirty(true);
    setMessage(null);
  }

  function patchBlocks(patch: Partial<ExperienceContentBlocks>) {
    patchActive({ contentBlocks: { ...(active?.contentBlocks ?? {}), ...patch } });
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/portal-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experienceTemplates: templates }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      if (json.content?.experienceTemplates) {
        setTemplates(json.content.experienceTemplates);
      }
      setDirty(false);
      setMessage("Master copy saved. New proposals and gap-fills use these defaults.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!active) return null;

  const showMedia = !NO_MEDIA_TYPES.has(active.sectionType);
  const isWelcome = active.sectionType === "welcome";

  return (
    <div className="flex h-full min-h-0">
      <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-r border-atlas-border bg-atlas-surface/20">
        <div className="border-b border-atlas-border px-4 py-3">
          <p className="atlas-kicker">Master report</p>
          <h2 className="mt-1 font-serif text-lg">Page templates</h2>
          <p className="mt-1 text-xs leading-relaxed text-atlas-muted">
            Default copy and media for every proposal. Per-proposal edits override these in Design
            report.
          </p>
        </div>
        <nav className="space-y-0.5 p-3">
          {templates.map((t) => {
            const label =
              EXPERIENCE_TAB_LABELS[t.sectionType as ExperienceSectionType] ?? t.title;
            return (
              <button
                key={t.sectionType}
                type="button"
                onClick={() => setActiveType(t.sectionType)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                  t.sectionType === activeType
                    ? "bg-atlas-accent/15 text-atlas-text"
                    : "text-atlas-muted hover:bg-atlas-surface/60 hover:text-atlas-text"
                )}
              >
                <span className="truncate">{label}</span>
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    t.visible ? "bg-atlas-accent" : "bg-atlas-border"
                  )}
                />
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="atlas-kicker">
                {EXPERIENCE_TAB_LABELS[active.sectionType as ExperienceSectionType] ??
                  active.title}
              </p>
              <h3 className="mt-1 font-serif text-2xl">Master page content</h3>
            </div>
            <label className="flex items-center gap-2 text-sm text-atlas-muted">
              <input
                type="checkbox"
                checked={active.visible}
                onChange={(e) => patchActive({ visible: e.target.checked })}
                className="accent-atlas-accent"
              />
              Visible by default
            </label>
          </div>

          <div className="mt-8 space-y-6">
            <div>
              <Label>Page title</Label>
              <Input
                value={active.title}
                onChange={(e) => patchActive({ title: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Body copy</Label>
              <textarea
                value={active.bodyCopy ?? ""}
                onChange={(e) => patchActive({ bodyCopy: e.target.value })}
                rows={isWelcome ? 10 : 6}
                className="atlas-input mt-1.5 w-full"
              />
            </div>
            {showMedia ? (
              <MediaUploadField
                label="Hero image / video"
                value={active.imageUrl}
                onChange={(url) => patchActive({ imageUrl: url })}
                hint="Uploaded to shared storage. Used as default hero for this page."
              />
            ) : null}
            {showMedia ? (
              <GalleryEditor
                items={active.contentBlocks?.gallery ?? []}
                onChange={(items: ExperienceGalleryItem[]) => patchBlocks({ gallery: items })}
              />
            ) : null}
            {isWelcome ? (
              <div className="grid gap-4 rounded-lg border border-atlas-border bg-atlas-surface/30 p-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <p className="atlas-kicker">Welcome letter signature</p>
                </div>
                <div>
                  <Label>Signatory name</Label>
                  <Input
                    value={active.signatoryName ?? ""}
                    onChange={(e) =>
                      patchActive({ signatoryName: e.target.value || null })
                    }
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Signatory title</Label>
                  <Input
                    value={active.signatoryTitle ?? ""}
                    onChange={(e) =>
                      patchActive({ signatoryTitle: e.target.value || null })
                    }
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Market link URL</Label>
                  <Input
                    value={active.contentBlocks?.aircraftMarketUrl ?? ""}
                    onChange={(e) =>
                      patchBlocks({ aircraftMarketUrl: e.target.value || null })
                    }
                    className="mt-1.5"
                    placeholder="https://prismjet.net/fleet/"
                  />
                </div>
                <div>
                  <Label>Market button label</Label>
                  <Input
                    value={active.contentBlocks?.aircraftMarketButtonLabel ?? ""}
                    onChange={(e) =>
                      patchBlocks({
                        aircraftMarketButtonLabel: e.target.value || null,
                      })
                    }
                    className="mt-1.5"
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-atlas-border bg-atlas-bg/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3">
            <p className="text-xs text-atlas-muted">
              {message ?? (dirty ? "Unsaved master changes" : "Live for new proposals immediately after save.")}
            </p>
            <Button type="button" onClick={() => void save()} disabled={saving || !dirty}>
              {saving ? "Saving…" : "Save master copy"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
