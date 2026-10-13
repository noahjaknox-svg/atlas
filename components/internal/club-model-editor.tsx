"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CLUB_DEFAULTS,
  SPEC_SWITCHES,
  WORKBOOK_SWITCHES,
  computeClubOwnerView,
  computeClubPrismjetView,
  membersPerAircraft,
  type ClubInputs,
} from "@/lib/club-proforma";
import { fmtInt, fmtPct, fmtUsd, fmtUsdCompact } from "@/components/client/experience/club/club-format";

type NumField = {
  key: Exclude<keyof ClubInputs, "bridgeDownPayments" | "interimLiftRates" | "deadheadRatios" | "acquisitionMonths" | "operatingShareBasis" | "directCostBasis">;
  label: string;
  kind: "usd" | "pct" | "int" | "num";
  hint?: string;
};

const GROUPS: { title: string; description?: string; fields: NumField[] }[] = [
  {
    title: "Aircraft",
    fields: [
      { key: "assetCost", label: "Aircraft cost", kind: "usd" },
      { key: "downPaymentPct", label: "Down payment", kind: "pct" },
      { key: "interestRate", label: "Interest rate", kind: "pct" },
      { key: "termYears", label: "Loan term (years)", kind: "int" },
      { key: "fixedAnnualCostPerAircraft", label: "Fixed operating cost / aircraft / year", kind: "usd" },
      { key: "directCostPerFlightHour", label: "Direct cost per flight hour", kind: "usd" },
      { key: "annualCapacityHours", label: "Annual flight-hour capacity", kind: "int" },
      { key: "occupancyRate", label: "Occupancy rate", kind: "pct" },
      { key: "conformityMonths", label: "Conformity lead time (months)", kind: "int" },
      { key: "maxAircraft", label: "Maximum aircraft", kind: "int" },
    ],
  },
  {
    title: "Member terms",
    fields: [
      { key: "initiationFee", label: "Initiation fee", kind: "usd", hint: "Non-refundable. Never described as a deposit or capital contribution." },
      { key: "monthlyDues", label: "Monthly dues", kind: "usd" },
      { key: "blockHourRate", label: "Block hour rate", kind: "usd" },
      { key: "allocationHours", label: "Annual hour allocation", kind: "int" },
      { key: "flownHoursPerMember", label: "Hours members actually fly / year", kind: "int", hint: "Above the allocation is billed as overage." },
      { key: "overageMarkup", label: "Overage markup on cost", kind: "pct" },
    ],
  },
  {
    title: "Member growth",
    fields: [
      { key: "foundingMembers", label: "Founding members (month 1)", kind: "int" },
      { key: "membersPerYear", label: "New members per year", kind: "num", hint: "Spec: 10. Workbook: 3." },
    ],
  },
  {
    title: "Operator and lift",
    fields: [
      { key: "operatingSharePct", label: "Operator share", kind: "pct" },
      { key: "offFleetOccupiedRate", label: "Outside lift per occupied hour", kind: "usd", hint: "Base case $12,000; downside $14,000." },
    ],
  },
  {
    title: "Ownership structures",
    fields: [
      { key: "licenceFee", label: "Licence fee / year", kind: "usd" },
      { key: "royaltyPct", label: "Royalty on club gross", kind: "pct" },
      { key: "jvSilverleafPct", label: "JV: Silverleaf share", kind: "pct" },
      { key: "ownerFinancedSilverleafPct", label: "Owner-financed: Silverleaf share", kind: "pct" },
    ],
  },
];

/** Recommended base case: spec share basis, workbook cost basis, $12,000 outside lift. */
const RECOMMENDED_SWITCHES: Partial<ClubInputs> = {
  operatingShareBasis: CLUB_DEFAULTS.operatingShareBasis,
  directCostBasis: CLUB_DEFAULTS.directCostBasis,
  offFleetOccupiedRate: CLUB_DEFAULTS.offFleetOccupiedRate,
  acquisitionMonths: undefined,
};

function toDisplay(f: NumField, v: number): string {
  if (f.kind === "pct") return String(+(v * 100).toFixed(3));
  return String(v);
}
function fromDisplay(f: NumField, raw: string): number | null {
  const n = Number(raw.replace(/[$,%\s]/g, ""));
  if (!Number.isFinite(n)) return null;
  return f.kind === "pct" ? n / 100 : n;
}

export function ClubModelEditor({
  proposalId,
  proposalName,
  enabled,
  initialInputs,
}: {
  proposalId: string;
  proposalName: string;
  enabled: boolean;
  initialInputs: ClubInputs;
}) {
  const [saved, setSaved] = useState(initialInputs);
  const [draft, setDraft] = useState(initialInputs);
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "ok" | "error"; message?: string }>({ kind: "idle" });
  const [created, setCreated] = useState(enabled);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved) || !created;
  const owner = useMemo(() => computeClubOwnerView(draft), [draft]);
  const pj = useMemo(() => computeClubPrismjetView(draft), [draft]);
  const month60 = owner.monthly.months[owner.monthly.months.length - 1];
  const perTail = membersPerAircraft(draft);
  const offFleet = owner.monthly.months.reduce((s, m) => s + m.offFleetOccupiedHours, 0);

  function setField(f: NumField, raw: string) {
    const v = fromDisplay(f, raw);
    if (v == null) return;
    setDraft((d) => ({ ...d, [f.key]: v }));
  }

  async function save() {
    setStatus({ kind: "saving" });
    const res = await fetch(`/api/proposals/${proposalId}/club`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: draft }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus({ kind: "error", message: json?.error ?? "Could not save" });
      return;
    }
    setSaved(json.inputs ?? draft);
    setCreated(true);
    setStatus({ kind: "ok", message: "Saved. Republish the portal to update the client view." });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-atlas-text">Club model</h1>
          <p className="mt-1 text-sm text-atlas-muted">
            {proposalName}. Inputs for the Silverleaf club pro forma. The client portal shows the owner view only.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status.kind === "ok" ? <span className="text-xs text-emerald-400">{status.message}</span> : null}
          {status.kind === "error" ? <span className="text-xs text-rose-400">{status.message}</span> : null}
          <Button type="button" onClick={save} disabled={!dirty || status.kind === "saving"}>
            {status.kind === "saving" ? "Saving…" : created ? "Save inputs" : "Create club inputs"}
          </Button>
        </div>
      </div>

      {!created ? (
        <p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
          This proposal has no club inputs yet. Set the aircraft&apos;s usage type to the club type to create them
          automatically, or save here to create them from the defaults.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-atlas-muted">Assumption basis</span>
            <Button type="button" variant="secondary" size="sm" onClick={() => setDraft((d) => ({ ...d, ...RECOMMENDED_SWITCHES }))}>
              Recommended base case
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setDraft((d) => ({ ...d, ...SPEC_SWITCHES }))}>
              Spec basis
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setDraft((d) => ({ ...d, ...WORKBOOK_SWITCHES, acquisitionMonths: undefined }))}>
              Workbook basis
            </Button>
          </div>

          <section className="rounded-xl border border-atlas-border p-4">
            <h2 className="text-sm font-semibold text-atlas-text">Contested assumptions</h2>
            <p className="mt-1 text-xs text-atlas-muted">Where the program spec and the workbook disagree. Each changes the headline numbers.</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="text-atlas-muted">Operator share is taken on</span>
                <select className="atlas-input mt-1 h-9 w-full" value={draft.operatingShareBasis} onChange={(e) => setDraft((d) => ({ ...d, operatingShareBasis: e.target.value as ClubInputs["operatingShareBasis"] }))}>
                  <option value="gross">Club gross revenue (spec)</option>
                  <option value="flight">Flight revenue only (workbook)</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="text-atlas-muted">Direct cost is charged on</span>
                <select className="atlas-input mt-1 h-9 w-full" value={draft.directCostBasis} onChange={(e) => setDraft((d) => ({ ...d, directCostBasis: e.target.value as ClubInputs["directCostBasis"] }))}>
                  <option value="occupied_over_occupancy">Occupied ÷ occupancy, incl. repositioning (workbook)</option>
                  <option value="occupied">Occupied hours only (spec)</option>
                </select>
              </label>
            </div>
          </section>

          {GROUPS.map((g) => (
            <section key={g.title} className="rounded-xl border border-atlas-border p-4">
              <h2 className="text-sm font-semibold text-atlas-text">{g.title}</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {g.fields.map((f) => (
                  <label key={f.key} className="text-sm">
                    <span className="text-atlas-muted">{f.label}</span>
                    <Input
                      inputMode="decimal"
                      className="mt-1 h-9"
                      defaultValue={toDisplay(f, draft[f.key] as number)}
                      key={`${f.key}-${toDisplay(f, draft[f.key] as number)}`}
                      onBlur={(e) => setField(f, e.target.value)}
                    />
                    {f.hint ? <span className="mt-1 block text-[11px] text-atlas-muted">{f.hint}</span> : null}
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-xl border border-atlas-border p-4">
            <h2 className="text-sm font-semibold text-atlas-text">Live result</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {[
                ["Members per aircraft", fmtInt(perTail)],
                ["Acquisition trigger", `${fmtInt(owner.acquisitionTrigger)} initiations`],
                ["Annual debt service / aircraft", fmtUsd(owner.annualDebtServicePerAircraft)],
                ["Members, month 60", fmtInt(month60.members)],
                ["Aircraft, month 60", fmtInt(month60.fleet)],
                ["Cash, month 60", fmtUsdCompact(month60.cumulative)],
                ["Lowest cash point", owner.monthly.lowPoint ? `${fmtUsdCompact(owner.monthly.lowPoint.cumulative)} (month ${owner.monthly.lowPoint.month})` : "Never negative"],
                ["Outside-lift hours, 5 yrs", fmtInt(offFleet)],
                ["Club net, 3 aircraft", fmtUsdCompact(owner.structures.state.clubNet)],
                ["Operator share, 3 aircraft", fmtUsdCompact(pj.operatingShareAnnual)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-atlas-muted">{k}</dt>
                  <dd className="text-right tabular-nums text-atlas-text">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded-xl border border-atlas-border p-4 text-sm">
            <h2 className="text-sm font-semibold text-atlas-text">Silverleaf annual cash, 3 aircraft</h2>
            <ul className="mt-2 space-y-1.5">
              {owner.structures.owner.map((o) => (
                <li key={o.key} className="flex justify-between gap-3">
                  <span className="text-atlas-muted">{o.label}</span>
                  <span className="tabular-nums text-atlas-text">{fmtUsd(o.silverleafAnnualCash)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-atlas-muted">
              Owner share {fmtPct(draft.operatingSharePct)} of {draft.operatingShareBasis === "gross" ? "gross" : "flight"} revenue.
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" className="w-full" onClick={() => setDraft(saved)} disabled={!dirty}>
            Discard changes
          </Button>
        </aside>
      </div>
    </div>
  );
}

