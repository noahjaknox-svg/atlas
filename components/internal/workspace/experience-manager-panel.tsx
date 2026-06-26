"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { EXPERIENCE_SECTION_TYPES, EXPERIENCE_TAB_LABELS, SECTION_TYPE_TO_SLUG } from "@/lib/experience-content";
import {
  PROSPECT_PORTAL_DESIGNER,
  PREVIEW_PROSPECT_PORTAL,
} from "@/lib/product-terminology";
import type {
  ExperienceContentBlocks,
  ExperienceSectionType,
} from "@/lib/experience-content";

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
  contentBlocks?: ExperienceContentBlocks | null;
};

export function ExperienceManagerForm({
  sections,
  onSectionsChange,
  portalSlug,
}: {
  sections: ExperienceSectionRow[];
  onSectionsChange: (next: ExperienceSectionRow[]) => void;
  portalSlug?: string | null;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const experienceSections = sections
    .filter((s) =>
      EXPERIENCE_SECTION_TYPES.includes(s.sectionType as ExperienceSectionType)
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);

  function updateSection(index: number, patch: Partial<ExperienceSectionRow>) {
    const globalIndex = sections.findIndex((s) => s.id === experienceSections[index]!.id);
    if (globalIndex < 0) return;
    const next = [...sections];
    next[globalIndex] = { ...next[globalIndex]!, ...patch };
    onSectionsChange(next);
  }

  return (
    <div>
      <p className="text-xs leading-relaxed text-atlas-muted">
        Choose which pages to include and edit their copy. Layout, animations, and visuals are
        set globally in the {PROSPECT_PORTAL_DESIGNER}. Prospects see changes after you publish.
      </p>

      <div className="mt-3 space-y-2">
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
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                onClick={() => setExpanded(isOpen ? null : sec.sectionType)}
              >
                <span className="text-xs font-medium text-atlas-text">{label}</span>
                <label
                  className="flex items-center gap-1.5 text-[10px]"
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
                <div className="space-y-2 border-t border-atlas-border/40 p-3">
                  <Input
                    value={sec.title}
                    onChange={(e) => updateSection(index, { title: e.target.value })}
                    className="h-8 text-xs"
                    placeholder="Title"
                  />
                  <AutoResizeTextarea
                    value={sec.bodyCopy ?? ""}
                    onChange={(value) => updateSection(index, { bodyCopy: value })}
                    minRows={2}
                    className="w-full rounded border border-atlas-border/80 bg-atlas-bg px-2 py-1.5 text-xs"
                    placeholder="Body copy — use {contactName} on Welcome"
                  />
                  {sec.sectionType === "welcome" ? (
                    <>
                      <Input
                        value={sec.signatoryName ?? ""}
                        onChange={(e) =>
                          updateSection(index, { signatoryName: e.target.value || null })
                        }
                        className="h-8 text-xs"
                        placeholder="Signatory name"
                      />
                      <Input
                        value={sec.signatoryTitle ?? ""}
                        onChange={(e) =>
                          updateSection(index, { signatoryTitle: e.target.value || null })
                        }
                        className="h-8 text-xs"
                        placeholder="Signatory title"
                      />
                    </>
                  ) : null}
                  {portalSlug ? (
                    <a
                      href={`/${portalSlug}/experience/${SECTION_TYPE_TO_SLUG[sec.sectionType as ExperienceSectionType] ?? sec.sectionType}?draft=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-xs text-atlas-accent hover:underline"
                    >
                      {PREVIEW_PROSPECT_PORTAL}
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
