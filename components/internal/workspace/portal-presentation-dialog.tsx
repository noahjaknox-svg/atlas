"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import {
  PortalPresentationForm,
  type PortalPresentationState,
} from "@/components/internal/workspace/portal-presentation-panel";
import {
  ExperienceManagerForm,
  type ExperienceSectionRow,
} from "@/components/internal/workspace/experience-manager-panel";
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

type PresentationBaseline = {
  sections: ExperienceSectionRow[];
  presentation: PortalPresentationState;
};

function cloneSections(sections: ExperienceSectionRow[]): ExperienceSectionRow[] {
  return JSON.parse(JSON.stringify(sections)) as ExperienceSectionRow[];
}

function clonePresentation(state: PortalPresentationState): PortalPresentationState {
  return {
    ...state,
    portalSpecHighlights: [...state.portalSpecHighlights],
  };
}

function snapshotsEqual(a: PresentationBaseline, b: PresentationBaseline): boolean {
  return (
    JSON.stringify(a.sections) === JSON.stringify(b.sections) &&
    JSON.stringify(a.presentation) === JSON.stringify(b.presentation)
  );
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
  aircraftId,
  initial,
  onSaved,
  sections,
  onSectionsChange,
  portalSlug,
  onExperienceSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalId: string;
  aircraftId: string;
  initial: PortalPresentationState;
  onSaved?: (next: PortalPresentationState) => void;
  sections: ExperienceSectionRow[];
  onSectionsChange: (next: ExperienceSectionRow[]) => void;
  portalSlug?: string | null;
  onExperienceSaved?: () => void;
}) {
  const [baseline, setBaseline] = useState<PresentationBaseline>(() => ({
    sections: cloneSections(sections),
    presentation: clonePresentation(initial),
  }));

  const [draftSections, setDraftSections] = useState<ExperienceSectionRow[]>(() =>
    cloneSections(sections)
  );
  const [draftPresentation, setDraftPresentation] = useState<PortalPresentationState>(() =>
    clonePresentation(initial)
  );
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetDraft = useCallback(
    (nextSections: ExperienceSectionRow[], nextPresentation: PortalPresentationState) => {
      const nextBaseline = {
        sections: cloneSections(nextSections),
        presentation: clonePresentation(nextPresentation),
      };
      setBaseline(nextBaseline);
      setDraftSections(cloneSections(nextSections));
      setDraftPresentation(clonePresentation(nextPresentation));
      setStatusMessage(null);
      setError(null);
    },
    []
  );

  const wasOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (justOpened) {
      resetDraft(sections, initial);
    }
  }, [open, sections, initial, aircraftId, resetDraft]);

  const dirty = useMemo(
    () =>
      !snapshotsEqual(baseline, {
        sections: draftSections,
        presentation: draftPresentation,
      }),
    [baseline, draftSections, draftPresentation]
  );

  function handleDiscard() {
    setDraftSections(cloneSections(baseline.sections));
    setDraftPresentation(clonePresentation(baseline.presentation));
    setStatusMessage(null);
    setError(null);
  }

  async function handleSave() {
    if (!dirty || saving) return;

    setSaving(true);
    setStatusMessage(null);
    setError(null);

    const sectionsChanged = JSON.stringify(draftSections) !== JSON.stringify(baseline.sections);
    const presentationChanged =
      JSON.stringify(draftPresentation) !== JSON.stringify(baseline.presentation);

    try {
      if (sectionsChanged) {
        const res = await fetch(`/api/proposals/${proposalId}/sections`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sections: sectionsForSave(draftSections) }),
        });
        if (!res.ok) throw new Error("Could not save experience pages or nav buttons.");
      }

      if (presentationChanged) {
        const res = await fetch(`/api/proposals/${proposalId}/aircraft/${aircraftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientSummary: draftPresentation.clientSummary || null,
            portalImageUrl: draftPresentation.portalImageUrl || null,
            portalVideoUrl: draftPresentation.portalVideoUrl || null,
            portalSpecHighlights: draftPresentation.portalSpecHighlights.filter((s) =>
              s.trim()
            ),
          }),
        });
        if (!res.ok) throw new Error("Could not save aircraft portal hero.");
      }

      setBaseline({
        sections: cloneSections(draftSections),
        presentation: clonePresentation(draftPresentation),
      });

      if (sectionsChanged) {
        onSectionsChange(cloneSections(draftSections));
        onExperienceSaved?.();
      }
      if (presentationChanged) {
        onSaved?.(clonePresentation(draftPresentation));
      }

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
              Experience pages, nav buttons, and aircraft hero media for the prospect portal.
            </Dialog.Description>
          </div>

          <div className="atlas-scroll min-h-0 flex-1 overflow-y-auto px-6 py-4">
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

            <div className="my-8 border-t border-atlas-border" aria-hidden />

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-atlas-muted">
                Client experience
              </h3>
              <div className="mt-3">
                <ExperienceManagerForm
                  sections={draftSections}
                  onSectionsChange={setDraftSections}
                  portalSlug={portalSlug}
                />
              </div>
            </section>

            <div className="my-8 border-t border-atlas-border" aria-hidden />

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-atlas-muted">
                Aircraft portal hero
              </h3>
              <p className="mt-1 text-xs text-atlas-muted">
                Hero media and copy for the selected aircraft on the prospect portal.
              </p>
              <div className="mt-3">
                <PortalPresentationForm
                  key={aircraftId}
                  value={draftPresentation}
                  onChange={setDraftPresentation}
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
