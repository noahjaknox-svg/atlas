"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/lib/routes";

const PROSPECT_TYPES = [
  { value: "individual_owner", label: "Individual owner" },
  { value: "company_owner", label: "Company owner" },
  { value: "family_office", label: "Family office" },
  { value: "broker_referral", label: "Broker referral" },
  { value: "aircraft_buyer", label: "Aircraft buyer" },
  { value: "existing_client", label: "Existing PrismJet client" },
  { value: "other", label: "Other" },
];

const OPPORTUNITY_TYPES = [
  { value: "aircraft_management", label: "Aircraft management" },
  { value: "management_with_charter", label: "Aircraft management with charter" },
  { value: "part91_only", label: "Part 91 management only" },
  { value: "acquisition_support", label: "Aircraft acquisition support" },
  { value: "transition", label: "Transition from current manager" },
  { value: "charter_optimization", label: "Charter revenue optimization" },
  { value: "shared_ownership", label: "Shared ownership" },
  { value: "other", label: "Other" },
];

export function ProspectStepForm({
  mode,
  proposalId,
}: {
  mode: "new" | "edit";
  proposalId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());

    try {
      if (mode === "new") {
        const res = await fetch("/api/proposals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to create proposal");
        router.push(ROUTES.aircraftManagement.proposal(data.proposal.id, 2));
      } else if (proposalId) {
        await fetch(`/api/proposals/${proposalId}/assumptions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([
            { category: "prospect", assumptionName: "prospect_name", value: payload.prospectName, sourceType: "manual" },
            { category: "prospect", assumptionName: "contact_name", value: payload.contactName, sourceType: "manual" },
          ]),
        });
        router.push(ROUTES.aircraftManagement.proposal(proposalId, 2));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      <h2 className="font-serif text-2xl">Prospect Setup</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="prospectName">Prospect name *</Label>
          <Input id="prospectName" name="prospectName" required />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="companyName">Company / family office</Label>
          <Input id="companyName" name="companyName" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactName">Primary contact *</Label>
          <Input id="contactName" name="contactName" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactEmail">Email *</Label>
          <Input id="contactEmail" name="contactEmail" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactPhone">Phone</Label>
          <Input id="contactPhone" name="contactPhone" type="tel" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prospectType">Prospect type *</Label>
          <select
            id="prospectType"
            name="prospectType"
            required
            className="flex h-10 w-full rounded-md border border-atlas-border bg-atlas-surface px-3 text-sm"
          >
            {PROSPECT_TYPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="opportunityType">Opportunity type *</Label>
          <select
            id="opportunityType"
            name="opportunityType"
            required
            className="flex h-10 w-full rounded-md border border-atlas-border bg-atlas-surface px-3 text-sm"
          >
            {OPPORTUNITY_TYPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="internalNotes">Internal notes</Label>
          <textarea
            id="internalNotes"
            name="internalNotes"
            rows={3}
            className="w-full rounded-md border border-atlas-border bg-atlas-surface px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="clientSummary">Prospect-facing summary</Label>
          <textarea
            id="clientSummary"
            name="clientSummary"
            rows={3}
            className="w-full rounded-md border border-atlas-border bg-atlas-surface px-3 py-2 text-sm"
          />
        </div>
      </div>
      {error && <p className="text-sm text-atlas-danger">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Save & Continue"}
      </Button>
    </form>
  );
}
