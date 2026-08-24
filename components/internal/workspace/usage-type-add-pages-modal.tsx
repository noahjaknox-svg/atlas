"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";

export function UsageTypeAddPagesModal({
  open,
  onOpenChange,
  options,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pages not already assigned to the selected usage type. */
  options: { id: string; label: string }[];
  onAdd: (sectionIds: string[]) => void;
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setChecked(new Set());
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onAdd(Array.from(checked));
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-atlas-border bg-atlas-surface p-6 shadow-2xl focus:outline-none">
          <Dialog.Title className="atlas-dialog-title">Add pages</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-relaxed text-atlas-muted">
            Choose pages to assign to this usage type.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="mt-4">
            {options.length === 0 ? (
              <p className="text-sm text-atlas-muted">
                Every page is already assigned to this usage type.
              </p>
            ) : (
              <div className="max-h-72 space-y-1.5 overflow-y-auto">
                {options.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-atlas-text hover:bg-atlas-bg/60"
                  >
                    <input
                      type="checkbox"
                      checked={checked.has(opt.id)}
                      onChange={(e) =>
                        setChecked((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(opt.id);
                          else next.delete(opt.id);
                          return next;
                        })
                      }
                      className="accent-atlas-accent"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2 border-t border-atlas-border/60 pt-4">
              <Dialog.Close asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={checked.size === 0}>
                Add {checked.size > 0 ? checked.size : ""}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
