"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import {
  PortalPresentationForm,
  type PortalPresentationState,
} from "@/components/internal/workspace/portal-presentation-panel";

export function PortalPresentationDialog({
  open,
  onOpenChange,
  proposalId,
  aircraftId,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalId: string;
  aircraftId: string;
  initial: PortalPresentationState;
  onSaved?: (next: PortalPresentationState) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-atlas-border bg-atlas-surface shadow-2xl focus:outline-none">
          <div className="shrink-0 border-b border-atlas-border px-6 py-4">
            <Dialog.Title className="font-serif text-xl">Client portal presentation</Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-atlas-muted">
              Hero media and copy for the selected aircraft on the client portal.
            </Dialog.Description>
          </div>

          <div className="atlas-scroll min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <PortalPresentationForm
              key={aircraftId}
              proposalId={proposalId}
              aircraftId={aircraftId}
              initial={initial}
              onSaved={onSaved}
            />
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
