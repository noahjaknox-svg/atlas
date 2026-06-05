"use client";

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
  needsRepublish,
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
  needsRepublish?: boolean;
  onExperienceSaved?: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-atlas-border bg-atlas-surface shadow-2xl focus:outline-none">
          <div className="shrink-0 border-b border-atlas-border px-6 py-4">
            <Dialog.Title className="font-serif text-xl">Edit presentation</Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-atlas-muted">
              Client experience pages and aircraft hero media for the portal.
            </Dialog.Description>
          </div>

          <div className="atlas-scroll min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-atlas-muted">
                Portal links
              </h3>
              <div className="mt-3">
                <PortalMarketLinkForm
                  proposalId={proposalId}
                  sections={sections}
                  onSectionsChange={onSectionsChange}
                  onSaved={onExperienceSaved}
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
                  proposalId={proposalId}
                  sections={sections}
                  onSectionsChange={onSectionsChange}
                  portalSlug={portalSlug}
                  needsRepublish={needsRepublish}
                  onSaved={onExperienceSaved}
                />
              </div>
            </section>

            <div className="my-8 border-t border-atlas-border" aria-hidden />

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-atlas-muted">
                Aircraft portal hero
              </h3>
              <p className="mt-1 text-xs text-atlas-muted">
                Hero media and copy for the selected aircraft on the client portal.
              </p>
              <div className="mt-3">
                <PortalPresentationForm
                  key={aircraftId}
                  proposalId={proposalId}
                  aircraftId={aircraftId}
                  initial={initial}
                  onSaved={onSaved}
                />
              </div>
            </section>
          </div>

          <div className="flex shrink-0 justify-end border-t border-atlas-border px-6 py-3">
            <Dialog.Close asChild>
              <Button type="button" variant="secondary" size="sm">
                Close
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
