"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { type ExperienceSectionRow } from "@/components/internal/workspace/experience-manager-panel";
import { PortalPagesPanel } from "@/components/internal/workspace/portal-pages-panel";
import { PortalMarketLinkForm } from "@/components/internal/workspace/portal-market-link-form";
import {
  EXPERIENCE_SECTION_TYPES,
  sanitizeExperiencePageLinks,
  type ExperienceSectionType,
} from "@/lib/experience-content";
import {
  PROSPECT_PORTAL_SAVE_HINT,
  EDIT_PROSPECT_PORTAL,
} from "@/lib/product-terminology";

function cloneSections(sections: ExperienceSectionRow[]): ExperienceSectionRow[] {
  return JSON.parse(JSON.stringify(sections)) as ExperienceSectionRow[];
}

function sectionsEqual(a: ExperienceSectionRow[], b: ExperienceSectionRow[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function experienceSectionsForSave(sections: ExperienceSectionRow[]) {
  return sections
    .filter((s) => EXPERIENCE_SECTION_TYPES.includes(s.sectionType as ExperienceSectionType))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function sectionsForSave(sections: ExperienceSectionRow[]) {
  return experienceSectionsForSave(sections).map((section) => {
    if (section.sectionType !== "welcome" || !section.contentBlocks) return section;

    const blocks = section.contentBlocks as ExperienceSectionRow["contentBlocks"] & {
      navLinks?: unknown;
    };

    return {
      ...section,
      contentBlocks: {
        ...blocks,
        navLinks: sanitizeExperiencePageLinks(blocks.navLinks),
      },
    };
  });
}

export function PortalPresentationDialog({
  open,
  onOpenChange,
  proposalId,
  onSaved,
  sections,
  onSectionsChange,
  onExperienceSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalId: string;
  onSaved?: () => void;
  sections: ExperienceSectionRow[];
  onSectionsChange: (next: ExperienceSectionRow[]) => void;
  onExperienceSaved?: () => void;
}) {
  const [baseline, setBaseline] = useState<ExperienceSectionRow[]>(() => cloneSections(sections));

  const [draftSections, setDraftSections] = useState<ExperienceSectionRow[]>(() =>
    cloneSections(sections)
  );
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetDraft = useCallback((nextSections: ExperienceSectionRow[]) => {
    setBaseline(cloneSections(nextSections));
    setDraftSections(cloneSections(nextSections));
    setStatusMessage(null);
    setError(null);
  }, []);

  const wasOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (justOpened) {
      resetDraft(sections);
    }
  }, [open, sections, resetDraft]);

  const dirty = useMemo(
    () => !sectionsEqual(baseline, draftSections),
    [baseline, draftSections]
  );

  function handleDiscard() {
    setDraftSections(cloneSections(baseline));
    setStatusMessage(null);
    setError(null);
  }

  async function handleSave() {
    if (!dirty || saving) return;

    setSaving(true);
    setStatusMessage(null);
    setError(null);

    try {
      const res = await fetch(`/api/proposals/${proposalId}/sections`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: sectionsForSave(draftSections) }),
      });
      if (!res.ok) throw new Error("Could not save portal pages.");

      setBaseline(cloneSections(draftSections));
      onSectionsChange(cloneSections(draftSections));
      onExperienceSaved?.();
      onSaved?.();

      setStatusMessage(PROSPECT_PORTAL_SAVE_HINT);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  function requestClose() {
    if (dirty) {
      const discard = window.confirm(
        "You have unsaved changes. Discard them and close?"
      );
      if (!discard) return;
      handleDiscard();
    }
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-atlas-border bg-atlas-surface shadow-2xl focus:outline-none"
          onPointerDownOutside={(e) => {
            if (dirty) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (dirty) {
              e.preventDefault();
              requestClose();
            }
          }}
        >
          <div className="shrink-0 border-b border-atlas-border px-6 py-4">
            <Dialog.Title className="font-serif text-xl">{EDIT_PROSPECT_PORTAL}</Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-atlas-muted">
              Page visibility, welcome letter, pro forma intro, and nav menu buttons.
            </Dialog.Description>
          </div>

          <div className="atlas-scroll min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-atlas-muted">
                Portal pages
              </h3>
              <div className="mt-3">
                <PortalPagesPanel
                  proposalId={proposalId}
                  sections={draftSections}
                  onSectionsChange={setDraftSections}
                />
              </div>
            </section>

            <div className="my-8 border-t border-atlas-border" aria-hidden />

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-atlas-muted">
                Nav menu buttons
              </h3>
              <div className="mt-3">
                <PortalMarketLinkForm
                  sections={draftSections}
                  onSectionsChange={setDraftSections}
                />
              </div>
            </section>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-atlas-border px-6 py-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                disabled={!dirty || saving}
                onClick={() => void handleSave()}
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!dirty || saving}
                onClick={handleDiscard}
              >
                Discard changes
              </Button>
              {dirty ? (
                <span className="text-[10px] text-amber-200/80">Unsaved edits</span>
              ) : null}
              {error ? <span className="text-xs text-red-400">{error}</span> : null}
              {!error && statusMessage ? (
                <span className="text-xs text-atlas-muted">{statusMessage}</span>
              ) : null}
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={requestClose}>
              Close
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
