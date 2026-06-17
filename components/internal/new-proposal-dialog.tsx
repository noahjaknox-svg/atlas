"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect, type SearchableOption } from "@/components/ui/searchable-select";
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
  const [prospectName, setProspectName] = useState("");
  const [aircraftId, setAircraftId] = useState("");
  const [aircraftLabel, setAircraftLabel] = useState("");
  const [aircraftOptions, setAircraftOptions] = useState<SearchableOption[]>([]);
  const [aircraftLoading, setAircraftLoading] = useState(false);

  const searchAircraft = useCallback(async (query: string) => {
    setAircraftLoading(true);
    try {
      const res = await fetch(`/api/aircraft-master/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) return;
      const rows = (await res.json()) as Array<{ id: string; label: string }>;
      setAircraftOptions(rows.map((r) => ({ id: r.id, label: r.label })));
    } finally {
      setAircraftLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void searchAircraft("");
  }, [open, searchAircraft]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const payload = {
      prospectName: prospectName.trim(),
      aircraftModel: aircraftLabel.trim() || undefined,
    };

    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create proposal");
      setOpen(false);
      router.push(ROUTES.aircraftManagement.proposal(data.proposal.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {trigger ?? <Button size="sm">+ New Proposal</Button>}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-atlas-border bg-atlas-surface p-6 shadow-2xl focus:outline-none">
          <Dialog.Title className="font-serif text-2xl">New Proposal</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-atlas-muted">
            Enter the basics. You can configure everything on the workspace next.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-prospectName">
                Prospect name <span className="text-atlas-danger">*</span>
              </Label>
              <Input
                id="new-prospectName"
                name="prospectName"
                value={prospectName}
                onChange={(e) => setProspectName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <SearchableSelect
              label="Aircraft"
              placeholder="Search manufacturer or model…"
              value={aircraftId}
              displayValue={aircraftLabel}
              options={aircraftOptions}
              loading={aircraftLoading}
              onSearch={(q) => void searchAircraft(q)}
              onSelect={(opt) => {
                setAircraftId(opt?.id ?? "");
                setAircraftLabel(opt?.label ?? "");
              }}
            />
            {error && <p className="text-sm text-atlas-danger">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating…" : "Create & open workspace"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
