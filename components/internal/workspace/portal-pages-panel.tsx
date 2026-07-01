"use client";

import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { Input } from "@/components/ui/input";
import {
  EXPERIENCE_SECTION_TYPES,
  EXPERIENCE_TAB_LABELS,
  type ExperienceSectionType,
} from "@/lib/experience-content";
import { ROUTES } from "@/lib/routes";
import { PROSPECT_PORTAL_DESIGNER } from "@/lib/product-terminology";
import Link from "next/link";
import type { ExperienceSectionRow } from "./experience-manager-panel";

const TEXT_EDITABLE_TYPES = new Set(["welcome", "pro_forma"]);

export function PortalPagesPanel({
  sections,
  onSectionsChange,
  proposalId,
}: {
  sections: ExperienceSectionRow[];
  onSectionsChange: (next: ExperienceSectionRow[]) => void;
  proposalId: string;
}) {
  const experienceSections = sections
    .filter((s) =>
      EXPERIENCE_SECTION_TYPES.includes(s.sectionType as ExperienceSectionType)
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);

  function updateSection(sectionType: string, patch: Partial<ExperienceSectionRow>) {
    const next = sections.map((s) =>
      s.sectionType === sectionType ? { ...s, ...patch } : s
    );
    onSectionsChange(next);
  }

  return (
    <div>
      <p className="text-xs leading-relaxed text-atlas-muted">
        Choose which pages appear on the prospect portal. Edit the welcome letter and pro forma
        intro here. For photos, layout, and other pages, use the{" "}
        {PROSPECT_PORTAL_DESIGNER}.
      </p>

      <Link
        href={ROUTES.aircraftManagement.proposalDesignView(proposalId)}
        className="mt-3 inline-flex text-xs font-medium text-atlas-accent hover:underline"
      >
        Open Portal Designer →
      </Link>

      <div className="mt-4 space-y-2">
        {experienceSections.map((sec) => {
          const label =
            EXPERIENCE_TAB_LABELS[sec.sectionType as ExperienceSectionType] ?? sec.title;
          const editable = TEXT_EDITABLE_TYPES.has(sec.sectionType);

          return (
            <div
              key={sec.id}
              className="rounded border border-atlas-border/50 bg-atlas-bg/60 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-atlas-text">{label}</span>
                <label className="flex items-center gap-1.5 text-[10px] text-atlas-muted">
                  <input
                    type="checkbox"
                    checked={sec.visible}
                    onChange={(e) =>
                      updateSection(sec.sectionType, { visible: e.target.checked })
                    }
                    className="accent-atlas-accent"
                  />
                  On
                </label>
              </div>

              {editable && sec.sectionType === "welcome" ? (
                <div className="mt-3 space-y-2 border-t border-atlas-border/40 pt-3">
                  <AutoResizeTextarea
                    value={sec.bodyCopy ?? ""}
                    onChange={(value) => updateSection(sec.sectionType, { bodyCopy: value })}
                    minRows={4}
                    className="w-full rounded border border-atlas-border/80 bg-atlas-bg px-2 py-1.5 text-xs"
                    placeholder="Welcome letter — use {contactName} or {{contactName}}"
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      value={sec.signatoryName ?? ""}
                      onChange={(e) =>
                        updateSection(sec.sectionType, {
                          signatoryName: e.target.value || null,
                        })
                      }
                      className="h-8 text-xs"
                      placeholder="Signatory name"
                    />
                    <Input
                      value={sec.signatoryTitle ?? ""}
                      onChange={(e) =>
                        updateSection(sec.sectionType, {
                          signatoryTitle: e.target.value || null,
                        })
                      }
                      className="h-8 text-xs"
                      placeholder="Signatory title"
                    />
                  </div>
                </div>
              ) : null}

              {editable && sec.sectionType === "pro_forma" ? (
                <div className="mt-3 border-t border-atlas-border/40 pt-3">
                  <AutoResizeTextarea
                    value={sec.bodyCopy ?? ""}
                    onChange={(value) => updateSection(sec.sectionType, { bodyCopy: value })}
                    minRows={3}
                    className="w-full rounded border border-atlas-border/80 bg-atlas-bg px-2 py-1.5 text-xs"
                    placeholder="Pro forma page intro text"
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
