"use client";

import { useState } from "react";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UsageTypeSelector } from "@/components/internal/usage-type-selector";
import { UsageTypeAddPagesModal } from "./usage-type-add-pages-modal";
import {
  EXPERIENCE_SECTION_TYPES,
  EXPERIENCE_TAB_LABELS,
  type ExperienceSectionType,
} from "@/lib/experience-content";
import { isCustomPortalPage } from "@/lib/experience-page-slug";
import { ROUTES } from "@/lib/routes";
import { PROSPECT_PORTAL_DESIGNER } from "@/lib/product-terminology";
import Link from "next/link";
import type { ExperienceSectionRow } from "./experience-manager-panel";

const TEXT_EDITABLE_TYPES = new Set(["welcome", "pro_forma"]);

export function PortalPagesPanel({
  sections,
  onSectionsChange,
  proposalId,
  usageTypes,
}: {
  sections: ExperienceSectionRow[];
  onSectionsChange: (next: ExperienceSectionRow[]) => void;
  proposalId: string;
  usageTypes?: { id: string; name: string }[];
}) {
  const [selectedUsageTypeId, setSelectedUsageTypeId] = useState<string | null>(null);
  const [addPagesOpen, setAddPagesOpen] = useState(false);

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

  function pageLabel(s: ExperienceSectionRow): string {
    return isCustomPortalPage(s)
      ? s.title
      : EXPERIENCE_TAB_LABELS[s.sectionType as ExperienceSectionType] ?? s.title;
  }

  function setSectionUsageTypes(sectionId: string, usageTypeIds: string[]) {
    onSectionsChange(
      sections.map((s) => (s.id === sectionId ? { ...s, usageTypeIds } : s))
    );
  }

  const curatedSections = selectedUsageTypeId
    ? sections
        .filter((s) => s.usageTypeIds?.includes(selectedUsageTypeId))
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  const addPageOptions = selectedUsageTypeId
    ? sections
        .filter((s) => !s.usageTypeIds?.includes(selectedUsageTypeId))
        .map((s) => ({ id: s.id, label: pageLabel(s) }))
    : [];

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

      {usageTypes && usageTypes.length > 0 ? (
        <div className="mt-6 border-t border-atlas-border/40 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-atlas-muted">
            Pages by usage type
          </p>
          <p className="mt-1 text-xs leading-relaxed text-atlas-muted">
            Curate which pages apply to a usage type. Pages not assigned to any usage type show
            for every usage type.
          </p>
          <div className="mt-2">
            <UsageTypeSelector
              usageTypes={usageTypes}
              selectedId={selectedUsageTypeId}
              onChange={setSelectedUsageTypeId}
            />
          </div>

          {selectedUsageTypeId ? (
            <div className="mt-3 space-y-2">
              {curatedSections.length === 0 ? (
                <p className="text-xs text-atlas-muted">No pages assigned yet.</p>
              ) : (
                curatedSections.map((sec) => (
                  <div
                    key={sec.id}
                    className="flex items-center justify-between gap-2 rounded border border-atlas-border/50 bg-atlas-bg/60 px-3 py-2"
                  >
                    <span className="text-xs font-medium text-atlas-text">
                      {pageLabel(sec)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[10px]"
                      onClick={() =>
                        setSectionUsageTypes(
                          sec.id,
                          (sec.usageTypeIds ?? []).filter((id) => id !== selectedUsageTypeId)
                        )
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-1"
                onClick={() => setAddPagesOpen(true)}
              >
                + Add pages
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <UsageTypeAddPagesModal
        open={addPagesOpen}
        onOpenChange={setAddPagesOpen}
        options={addPageOptions}
        onAdd={(sectionIds) => {
          if (!selectedUsageTypeId) return;
          onSectionsChange(
            sections.map((s) =>
              sectionIds.includes(s.id)
                ? { ...s, usageTypeIds: [...(s.usageTypeIds ?? []), selectedUsageTypeId] }
                : s
            )
          );
        }}
      />
    </div>
  );
}
