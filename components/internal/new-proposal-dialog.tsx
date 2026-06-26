"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PROSPECT_NAME_LABEL, PROPOSAL_WORKSPACE } from "@/lib/product-terminology";
import { ROUTES } from "@/lib/routes";

export function NewProposalDialog({
  trigger,
  defaultOpen,
}: {
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clientName, setClientName] = useState("");

  function resetForm() {
    setClientName("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName: clientName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create proposal");
      setOpen(false);
      resetForm();
      router.push(ROUTES.aircraftManagement.proposal(data.proposal.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <Dialog.Trigger asChild>
        {trigger ?? <Button size="sm">+ New Proposal</Button>}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-atlas-border bg-atlas-surface p-6 shadow-2xl focus:outline-none">
          <Dialog.Title className="font-serif text-2xl">New Proposal</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-atlas-muted">
            Enter the prospect name to open the {PROPOSAL_WORKSPACE}. Add contact details and
            aircraft there.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-clientName">
                {PROSPECT_NAME_LABEL} <span className="text-atlas-danger">*</span>
              </Label>
              <Input
                id="new-clientName"
                name="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                autoFocus
                placeholder="e.g. Adam Pritchett"
              />
            </div>
            {error ? <p className="text-sm text-atlas-danger">{error}</p> : null}
            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={loading || !clientName.trim()}>
                {loading ? "Creating…" : "Create & open workspace"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
