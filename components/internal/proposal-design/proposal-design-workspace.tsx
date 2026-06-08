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
  SECTION_TYPE_TO_SLUG,
} from "@/lib/experience-content";
import type {
  ExperienceContentBlocks,
  ExperienceGalleryItem,
  ExperienceSectionType,
} from "@/lib/experience-content";
import type { ExperienceMasterTemplate } from "@/lib/experience-master";
import { getMasterTemplateForSection } from "@/lib/experience-master";
import { cn } from "@/lib/utils";

export type DesignSectionRow = {
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
  contentBlocks?: ExperienceContentBlocks | null;
};

const NO_MEDIA_TYPES = new Set(["disclaimer"]);

export function ProposalDesignWorkspace({
  proposalId,
  proposalName,
  sections: initialSections,
  portalSlug,
  portalUrl,
}: {
  proposalId: string;
  proposalName: string;
  sections: DesignSectionRow[];
  portalSlug: string | null;
  portalUrl: string | null;
}) {
  const experienceSections = useMemo(
    () =>
      initialSections
        .filter((s) =>
          EXPERIENCE_SECTION_TYPES.includes(s.sectionType as ExperienceSectionType)
        )
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [initialSections]
  );

  const [sections, setSections] = useState<DesignSectionRow[]>(experienceSections);
  const [activeType, setActiveType] = useState<string>(
    experienceSections[0]?.sectionType ?? "welcome"
  );
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const active = sections.find((s) => s.sectionType === activeType) ?? sections[0];

  function applyMasterTemplate(master: ExperienceMasterTemplate) {
    setSections((prev) =>
      prev.map((s) =>
        s.sectionType === activeType
          ? {
              ...s,
              title: master.title,
              bodyCopy: master.bodyCopy,
              visible: master.visible,
              imageUrl: master.imageUrl,
              videoUrl: master.videoUrl,
              posterUrl: master.posterUrl,
              signatoryName: master.signatoryName,
              signatoryTitle: master.signatoryTitle,
              contentBlocks: master.contentBlocks ?? null,
            }
          : s
      )
    );
    setDirty(true);
  }

  async function resetFromMaster() {
    setResetting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/portal-content");
      if (!res.ok) throw new Error("Could not load master copy");
      const json = await res.json();
      const templates = json.content?.experienceTemplates as ExperienceMasterTemplate[] | undefined;
      const master = getMasterTemplateForSection(templates, activeType);
      if (!master) throw new Error("No master template for this page");
      applyMasterTemplate(master);
      setMessage("Loaded master copy for this page. Save to apply to this proposal.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  }

  function patchActive(patch: Partial<DesignSectionRow>) {
    setSections((prev) =>
      prev.map((s) => (s.sectionType === activeType ? { ...s, ...patch } : s))
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
      const res = await fetch(`/api/proposals/${proposalId}/sections`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Save failed");
      }
      setDirty(false);
      setMessage("Saved. Publish or republish to update the client portal.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!active) {
    return (
      <div className="flex h-full items-center justify-center text-atlas-muted">
        No editable pages found.
      </div>
    );
  }

  const showMedia = !NO_MEDIA_TYPES.has(active.sectionType);
  const isWelcome = active.sectionType === "welcome";
  const previewSlugPart =
    SECTION_TYPE_TO_SLUG[active.sectionType as ExperienceSectionType] ?? active.sectionType;

  return (
    <div className="flex h-full min-h-0">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-r border-atlas-border bg-atlas-surface/20">
        <div className="border-b border-atlas-border px-4 py-3">
          <Link
            href={`/proposals/${proposalId}`}
            className="text-xs text-atlas-accent hover:underline"
          >
            ← Back to workspace
          </Link>
          <h1 className="mt-2 font-serif text-lg leading-tight">Design report</h1>
          <p className="mt-0.5 truncate text-xs text-atlas-muted">{proposalName}</p>
          <p className="mt-2 text-[11px] leading-snug text-atlas-muted">
            Master copy lives at{" "}
            <Link href="/proposal-design" className="text-atlas-accent hover:underline">
              Proposal Design
            </Link>
            . Reset a page below to restore the master version.
          </p>
        </div>

        <nav className="space-y-0.5 p-3">
          {sections.map((s) => {
            const label =
              EXPERIENCE_TAB_LABELS[s.sectionType as ExperienceSectionType] ?? s.title;
            const isActive = s.sectionType === activeType;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveType(s.sectionType)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                  isActive
                    ? "bg-atlas-accent/15 text-atlas-text"
                    : "text-atlas-muted hover:bg-atlas-surface/60 hover:text-atlas-text"
                )}
              >
                <span className="truncate">{label}</span>
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    s.visible ? "bg-atlas-accent" : "bg-atlas-border"
                  )}
                  title={s.visible ? "Visible" : "Hidden"}
                />
              </button>
            );
          })}
        </nav>

        {portalUrl ? (
          <div className="mt-auto border-t border-atlas-border p-3">
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs text-atlas-accent hover:underline"
            >
              Open live portal
            </a>
          </div>
        ) : null}
      </aside>

      {/* Editor pane */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="atlas-kicker">
                {EXPERIENCE_TAB_LABELS[active.sectionType as ExperienceSectionType] ??
                  active.title}
              </p>
              <h2 className="mt-1 font-serif text-2xl">Page content</h2>
            </div>
            <label className="flex items-center gap-2 text-sm text-atlas-muted">
              <input
                type="checkbox"
                checked={active.visible}
                onChange={(e) => patchActive({ visible: e.target.checked })}
                className="accent-atlas-accent"
              />
              Visible to client
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={resetting}
              onClick={() => void resetFromMaster()}
            >
              {resetting ? "Loading…" : "Reset page from master"}
            </Button>
            <Link
              href="/proposal-design"
              className="text-xs text-atlas-accent hover:underline"
            >
              Edit master copy →
            </Link>
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
                placeholder={
                  isWelcome ? "Use {contactName} to personalize the greeting." : "Body copy"
                }
              />
              {isWelcome ? (
                <p className="mt-1 text-xs text-atlas-muted">
                  Tip: <code>{"{contactName}"}</code> is replaced with the client&apos;s contact
                  name.
                </p>
              ) : null}
            </div>

            {showMedia ? (
              <MediaUploadField
                label="Hero image / video"
                value={active.imageUrl ?? null}
                onChange={(url) => patchActive({ imageUrl: url })}
                proposalId={proposalId}
                hint="Used as the page hero. Falls back to global branding if empty."
              />
            ) : null}

            {showMedia ? (
              <GalleryEditor
                items={active.contentBlocks?.gallery ?? []}
                onChange={(items: ExperienceGalleryItem[]) => patchBlocks({ gallery: items })}
                proposalId={proposalId}
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
                  <Label>Market link URL (header button)</Label>
                  <Input
                    value={active.contentBlocks?.aircraftMarketUrl ?? ""}
                    onChange={(e) =>
                      patchBlocks({ aircraftMarketUrl: e.target.value || null })
                    }
                    className="mt-1.5"
                    placeholder="https://…"
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
                    placeholder="Available aircraft"
                  />
                </div>
              </div>
            ) : null}

            {portalSlug && active.visible ? (
              <a
                href={`/${portalSlug}/experience/${previewSlugPart}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm text-atlas-accent hover:underline"
              >
                Preview this page (published version) →
              </a>
            ) : null}
          </div>
        </div>

        {/* Sticky save bar */}
        <div className="sticky bottom-0 border-t border-atlas-border bg-atlas-bg/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3">
            <p className="text-xs text-atlas-muted">
              {message ??
                (dirty ? "Unsaved changes" : "Changes are saved to the proposal, not yet published.")}
            </p>
            <Button type="button" onClick={() => void save()} disabled={saving || !dirty}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
