"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { parseFormattedNumber } from "@/lib/utils";
import type { Proposal, Prospect, AircraftInstance, AircraftMaster, ProposalAssumption, ProposalScenario, ClientPortal } from "@prisma/client";
import { aircraftAssumptionCategory } from "@/lib/aircraft-workspace";

type ProposalWithRelations = Proposal & {
  prospect: Prospect;
  aircraftInstance: (AircraftInstance & { aircraftMaster: AircraftMaster | null }) | null;
  assumptions: ProposalAssumption[];
  scenarios: ProposalScenario[];
  clientPortal: ClientPortal | null;
};

async function saveAssumptions(
  proposalId: string,
  items: Array<{
    category: string;
    assumptionName: string;
    value: string | number;
    sourceType?: string;
    confidence?: string;
    visibleToClient?: boolean;
    editableByClient?: boolean;
  }>
) {
  const res = await fetch(`/api/proposals/${proposalId}/assumptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(items),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Failed to save");
  }
}

function resolveWizardFieldValue(
  assumptions: ProposalAssumption[],
  aircraftInstanceId: string | null,
  category: string,
  name: string
): string {
  const exact = assumptions.find(
    (a) => a.category === category && a.assumptionName === name
  );
  if (exact?.value.trim()) return exact.value;

  if (aircraftInstanceId) {
    const acCategory = aircraftAssumptionCategory(aircraftInstanceId);
    const onAircraft = assumptions.find(
      (a) => a.category === acCategory && a.assumptionName === name
    );
    if (onAircraft?.value.trim()) return onAircraft.value;
  }

  const byName = assumptions.find((a) => a.assumptionName === name);
  return byName?.value.trim() ? byName.value : "";
}

function AssumptionForm({
  proposalId,
  step,
  fields,
  assumptions,
  aircraftInstanceId,
  onSuccess,
}: {
  proposalId: string;
  step: number;
  assumptions: ProposalAssumption[];
  aircraftInstanceId: string | null;
  fields: Array<{
    category: string;
    name: string;
    label: string;
    type?: string;
    required?: boolean;
    options?: Array<{ value: string; label: string }>;
  }>;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const items = fields.map((f) => {
      const raw = fd.get(f.name)?.toString() ?? "";
      return {
        category: f.category,
        assumptionName: f.name,
        value: f.type === "currency" ? parseFormattedNumber(raw) : raw,
        sourceType: "manual",
      };
    });

    try {
      await saveAssumptions(proposalId, items);
      await fetch(`/api/proposals/${proposalId}/calculate`, { method: "POST" });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => {
          const initialValue = resolveWizardFieldValue(
            assumptions,
            aircraftInstanceId,
            f.category,
            f.name
          );
          return (
          <div key={f.name} className={`space-y-2 ${f.type === "textarea" ? "sm:col-span-2" : ""}`}>
            <Label htmlFor={f.name}>
              {f.label}
              {f.required ? " *" : ""}
            </Label>
            {f.type === "textarea" ? (
              <textarea
                id={f.name}
                name={f.name}
                rows={3}
                required={f.required}
                defaultValue={initialValue}
                className="w-full rounded-md border border-atlas-border bg-atlas-surface px-3 py-2 text-sm"
              />
            ) : f.type === "select" && f.options ? (
              <select
                id={f.name}
                name={f.name}
                required={f.required}
                defaultValue={initialValue || f.options[0]?.value}
                className="w-full rounded-md border border-atlas-border bg-atlas-surface px-3 py-2 text-sm"
              >
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : f.type === "currency" ? (
              <WizardMoneyField
                id={f.name}
                name={f.name}
                required={f.required}
                defaultValue={initialValue}
              />
            ) : (
              <Input
                id={f.name}
                name={f.name}
                type={f.type ?? "text"}
                required={f.required}
                defaultValue={initialValue}
              />
            )}
          </div>
          );
        })}
      </div>
      {error && <p className="text-sm text-atlas-danger">{error}</p>}
      <div className="flex gap-3">
        {step > 1 && (
          <Link href={`/proposals/${proposalId}?step=${step - 1}`}>
            <Button type="button" variant="secondary">
              Back
            </Button>
          </Link>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save & Continue"}
        </Button>
      </div>
    </form>
  );
}

function WizardMoneyField({
  id,
  name,
  required,
  defaultValue = "",
}: {
  id: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <MoneyInput
      id={id}
      name={name}
      required={required}
      value={value}
      onChange={setValue}
      className="w-full rounded-md border border-atlas-border bg-atlas-surface px-3 py-2 text-sm"
    />
  );
}

function ReviewStep({
  proposal,
  proposalId,
  isAdmin,
}: {
  proposal: ProposalWithRelations;
  proposalId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [publishResult, setPublishResult] = useState<{
    slug: string;
    pin: string;
    portalUrl: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const scenario = proposal.scenarios[0];

  async function handleCalculate() {
    await fetch(`/api/proposals/${proposalId}/calculate`, { method: "POST" });
    router.refresh();
  }

  async function handlePublish() {
    setLoading(true);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/publish`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPublishResult(data);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setLoading(false);
    }
  }

  const lowConfidence = proposal.assumptions.filter((a) => a.confidence === "low").length;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h2 className="font-serif text-2xl">Review & Publish</h2>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 font-mono text-sm tabular-nums">
          <div>
            <p className="text-atlas-muted">Prospect</p>
            <p>{proposal.prospect.prospectName}</p>
          </div>
          <div>
            <p className="text-atlas-muted">Aircraft</p>
            <p>
              {proposal.aircraftInstance?.aircraftMaster
                ? `${proposal.aircraftInstance.aircraftMaster.manufacturer} ${proposal.aircraftInstance.aircraftMaster.model}`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-atlas-muted">Net annual cost</p>
            <p className="text-lg text-atlas-accent">
              {formatCurrency(scenario?.netAnnualCost ? Number(scenario.netAnnualCost) : null)}
            </p>
          </div>
          <div>
            <p className="text-atlas-muted">Cost per owner hour</p>
            <p>{formatCurrency(scenario?.costPerOwnerHour ? Number(scenario.costPerOwnerHour) : null)}</p>
          </div>
          {lowConfidence > 0 && (
            <p className="sm:col-span-2 text-sm text-atlas-danger">
              {lowConfidence} assumption(s) marked low confidence
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={handleCalculate}>
          Recalculate Pro Forma
        </Button>
        {proposal.clientPortal?.active && (
          <Link href={`/${proposal.clientPortal.slug}/experience/welcome`} target="_blank">
            <Button variant="secondary">Client Preview</Button>
          </Link>
        )}
        {isAdmin && !publishResult && (
          <Button onClick={handlePublish} disabled={loading}>
            {loading ? "Publishing…" : "Publish"}
          </Button>
        )}
      </div>

      {publishResult && (
        <Card className="border-atlas-accent/40">
          <CardContent className="space-y-2 pt-6 font-mono text-sm">
            <p className="text-atlas-success">Published successfully</p>
            <p>
              Link:{" "}
              <a href={publishResult.portalUrl} className="text-atlas-accent underline">
                {publishResult.portalUrl}
              </a>
            </p>
            <p className="text-atlas-danger">PIN (save now): {publishResult.pin}</p>
          </CardContent>
        </Card>
      )}

      <Link href={`/proposals/${proposalId}?step=9`}>
        <Button variant="ghost">Back</Button>
      </Link>
    </div>
  );
}

export function ProposalWizardStep({
  proposalId,
  step,
  proposal,
  isAdmin,
}: {
  proposalId: string;
  step: number;
  proposal: ProposalWithRelations;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const next = () => router.push(`/proposals/${proposalId}?step=${step + 1}`);

  const titles: Record<number, string> = {
    1: "Prospect",
    2: "Aircraft",
    3: "Base Location",
    4: "Operating Model",
    5: "Crew Configuration",
    6: "Costs & Programs",
    7: "Feature Options",
    8: "Charter Revenue",
    9: "Proposal Sections",
    10: "Review & Publish",
  };

  if (step === 10) {
    return <ReviewStep proposal={proposal} proposalId={proposalId} isAdmin={isAdmin} />;
  }

  const fieldSets: Record<
    number,
    Array<{
      category: string;
      name: string;
      label: string;
      type?: string;
      required?: boolean;
      options?: Array<{ value: string; label: string }>;
    }>
  > = {
    2: [
      { category: "aircraft", name: "aircraft_model", label: "Aircraft model", required: true },
      { category: "aircraft", name: "aircraft_year", label: "Year", type: "number", required: true },
      {
        category: "aircraft",
        name: "aircraft_value",
        label: "Estimated value ($)",
        type: "currency",
        required: true,
      },
      { category: "aircraft", name: "proposed_home_base", label: "Proposed home base (ICAO)", required: true },
      { category: "aircraft", name: "fuel_burn_gph", label: "Fuel burn (GPH)", type: "number" },
      { category: "aircraft", name: "aircraft_summary", label: "Client aircraft summary", type: "textarea" },
    ],
    3: [
      { category: "base", name: "home_airport_icao", label: "Home airport ICAO", required: true },
      { category: "base", name: "home_fuel_price", label: "Home fuel ($/gal)", type: "number", required: true },
      { category: "base", name: "away_fuel_price", label: "Away fuel ($/gal)", type: "number", required: true },
      { category: "base", name: "home_fuel_pct", label: "% fuel at home", type: "number", required: true },
      {
        category: "base",
        name: "hangar_pricing_mode",
        label: "Hangar price input",
        type: "select",
        options: [
          { value: "monthly", label: "Per month" },
          { value: "annual", label: "Total annual price" },
        ],
      },
      { category: "base", name: "hangar_monthly", label: "Monthly hangar cost", type: "currency" },
      { category: "base", name: "hangar_annual", label: "Annual hangar cost", type: "currency" },
    ],
    4: [
      { category: "operating", name: "operating_model", label: "Operating model", required: true },
      { category: "operating", name: "owner_annual_hours", label: "Owner annual hours", type: "number", required: true },
      { category: "operating", name: "charter_block_hours", label: "Charter block hours", type: "number" },
      { category: "operating", name: "charter_flight_hours", label: "Charter flight hours", type: "number" },
    ],
    5: [
      { category: "crew", name: "pic_salary", label: "PIC salary", type: "currency" },
      { category: "crew", name: "sic_salary", label: "SIC salary", type: "currency" },
      { category: "crew", name: "crew_total", label: "Total crew cost (annual)", type: "currency" },
      {
        category: "crew",
        name: "pic_training",
        label: "PIC training (annual, per pilot)",
        type: "currency",
      },
      {
        category: "crew",
        name: "sic_training",
        label: "SIC training (annual, per pilot)",
        type: "currency",
      },
    ],
    6: [
      { category: "costs", name: "management_fee", label: "Management fee", type: "currency" },
      { category: "costs", name: "insurance_annual", label: "Insurance (annual)", type: "currency" },
      { category: "costs", name: "insurance_premium_percent", label: "Insurance % of hull", type: "number" },
      { category: "costs", name: "total_fixed_costs", label: "Total fixed costs", type: "currency" },
      { category: "costs", name: "engine_program_rate", label: "Engine program ($/hr)", type: "currency" },
      { category: "costs", name: "fuel_burn_gph", label: "Fuel burn GPH", type: "number" },
      { category: "costs", name: "trip_expense_per_hour", label: "Trip expense ($/hr)", type: "currency" },
    ],
    8: [
      { category: "charter", name: "charter_rate", label: "Charter rate", type: "currency" },
      { category: "charter", name: "charter_payback_pct", label: "Charter payback %", type: "number" },
      {
        category: "charter",
        name: "fuel_surcharge",
        label: "Fuel surcharge ($/flight hr)",
        type: "currency",
      },
    ],
  };

  if (step === 1) {
    return (
      <p className="text-atlas-muted">
        Prospect saved. Continue to step 2 or{" "}
        <Link href={`/proposals/${proposalId}?step=2`} className="text-atlas-accent">
          configure aircraft
        </Link>
        .
      </p>
    );
  }

  if (step === 7 || step === 9) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h2 className="font-serif text-2xl">{titles[step]}</h2>
        <p className="text-atlas-muted">
          Section content is pre-seeded from defaults. Edit titles and body copy in a future iteration;
          for V1, proceed to review.
        </p>
        <div className="flex gap-3">
          <Link href={`/proposals/${proposalId}?step=${step - 1}`}>
            <Button variant="secondary">Back</Button>
          </Link>
          <Link href={`/proposals/${proposalId}?step=${step + 1}`}>
            <Button>Continue</Button>
          </Link>
        </div>
      </div>
    );
  }

  const fields = fieldSets[step];
  if (!fields) return null;

  return (
    <div>
      <h2 className="mb-6 font-serif text-2xl">{titles[step]}</h2>
      <AssumptionForm
        proposalId={proposalId}
        step={step}
        fields={fields}
        assumptions={proposal.assumptions}
        aircraftInstanceId={proposal.aircraftInstanceId}
        onSuccess={next}
      />
    </div>
  );
}
