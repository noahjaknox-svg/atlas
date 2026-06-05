"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type FormField = {
  key: string;
  label: string;
  type?: "text" | "number" | "select" | "textarea";
  options?: { value: string; label: string }[];
  required?: boolean;
};

export function EntityDialog({
  open,
  title,
  fields,
  values,
  onChange,
  onClose,
  onSave,
  saving,
}: {
  open: boolean;
  title: string;
  fields: FormField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClose: () => void;
  onSave: () => void;
  saving?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-atlas-border bg-atlas-bg p-6 shadow-xl">
          <Dialog.Title className="font-medium text-lg">{title}</Dialog.Title>
          <div className="mt-4 grid gap-3">
            {fields.map((f) => (
              <div key={f.key}>
                <Label htmlFor={f.key}>{f.label}</Label>
                {f.type === "select" && f.options ? (
                  <select
                    id={f.key}
                    value={values[f.key] ?? ""}
                    onChange={(e) => onChange(f.key, e.target.value)}
                    className="mt-1 h-10 w-full rounded border border-atlas-border bg-atlas-surface px-3 text-sm"
                  >
                    <option value="">—</option>
                    {f.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    id={f.key}
                    value={values[f.key] ?? ""}
                    onChange={(e) => onChange(f.key, e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded border border-atlas-border bg-atlas-surface px-3 py-2 text-sm"
                  />
                ) : (
                  <Input
                    id={f.key}
                    type={f.type === "number" ? "number" : "text"}
                    value={values[f.key] ?? ""}
                    onChange={(e) => onChange(f.key, e.target.value)}
                    className="mt-1"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
