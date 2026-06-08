"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";

export function DeleteConfirmDialog({
  open,
  title = "Delete record?",
  description = "This cannot be undone.",
  onConfirm,
  onCancel,
  confirming,
}: {
  open: boolean;
  title?: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirming?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-atlas-border bg-atlas-bg p-6 shadow-xl">
          <Dialog.Title className="font-medium text-lg">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-atlas-muted">
            {description}
          </Dialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={confirming}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-atlas-danger hover:bg-atlas-danger/10 hover:text-atlas-danger"
              onClick={onConfirm}
              disabled={confirming}
            >
              {confirming ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
