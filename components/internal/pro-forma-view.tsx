"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import type { ScenarioProFormaResult } from "@/lib/proforma";
import type { ScenarioInput } from "@/lib/proforma";
import type { ProFormaPayload } from "@/lib/proforma-load";

export function ProFormaView({
  proposalId,
  aircraftInstanceId,
  aircraftLabel,
  initialData,
}: {
  proposalId: string;
  aircraftInstanceId: string;
  aircraftLabel: string;
  initialData?: ProFormaPayload;
}) {
  const [period, setPeriod] = useState<"annual" | "monthly">("annual");
  const [inputs, setInputs] = useState<ScenarioInput[]>(initialData?.scenarioInputs ?? []);
  const [results, setResults] = useState<ScenarioProFormaResult[]>(initialData?.scenarios ?? []);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  const [breakEvenOpen, setBreakEvenOpen] = useState(false);
  const [assumptionsMeta, setAssumptionsMeta] = useState<
    { label: string; value: string; source: string }[]
  >(initialData?.assumptionsMeta ?? []);
  const [breakEvenBase, setBreakEvenBase] = useState<number | null>(
    initialData?.breakEvenBase ?? null
  );
  const [loading, setLoading] = useState(!initialData);
  const skipInitialLoad = useRef(!!initialData);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `/api/proposals/${proposalId}/proforma?aircraftInstanceId=${aircraftInstanceId}`
    );
    const json = await res.json();
    if (res.ok) {
      setResults(json.scenarios);
      setInputs(json.scenarioInputs);
      setAssumptionsMeta(json.assumptionsMeta ?? []);
      setBreakEvenBase(json.breakEvenBase ?? null);
    }
    setLoading(false);
  }, [proposalId, aircraftInstanceId]);

  useEffect(() => {
    if (skipInitialLoad.current) {
      skipInitialLoad.current = false;
      return;
    }
    void load();
  }, [load]);

  async function saveInputs(next: ScenarioInput[]) {
    setInputs(next);
    await fetch(`/api/proposals/${proposalId}/scenarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aircraftInstanceId, scenarios: next }),
    });
    await load();
  }

  function updateInput(index: number, field: keyof ScenarioInput, value: number) {
    const next = inputs.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    );
    void saveInputs(next);
  }

  const labels = ["Scenario A", "Scenario B (Base)", "Scenario C"];

  if (loading && results.length === 0) {
    return <p className="p-8 text-atlas-muted">Loading pro forma…</p>;
  }

  return (
    <div className="overflow-y-auto p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href={`/proposals/${proposalId}`}
            className="text-sm text-atlas-accent hover:underline"
          >
            ← Workspace
          </Link>
          <h1 className="mt-2 font-serif text-2xl">Pro Forma — {aircraftLabel}</h1>
        </div>
        <div className="flex rounded-md border border-atlas-border p-0.5">
          {(["annual", "monthly"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded px-3 py-1.5 text-sm capitalize ${
                period === p ? "bg-atlas-accent text-atlas-bg" : "text-atlas-muted"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-atlas-border text-left text-xs uppercase text-atlas-muted">
              <th className="py-2 pr-4">Inputs</th>
              {labels.map((l, i) => (
                <th
                  key={l}
                  className={`px-3 py-2 ${i === 1 ? "border-x-2 border-atlas-accent/50" : ""}`}
                >
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <InputRow
              label="Charter block hours"
              values={inputs}
              field="charterBlockHours"
              onChange={updateInput}
              highlightCol={1}
            />
            <InputRow
              label="Charter flight hours"
              values={inputs}
              field="charterFlightHours"
              onChange={updateInput}
              highlightCol={1}
            />
            <InputRow
              label="Owner flight hours"
              values={inputs}
              field="ownerFlightHours"
              onChange={updateInput}
              highlightCol={1}
            />
          </tbody>
        </table>
      </div>

      <PlTable results={results} period={period} />

      <Collapsible
        title="Assumptions used"
        open={assumptionsOpen}
        onToggle={() => setAssumptionsOpen((o) => !o)}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-atlas-muted">
              <th className="py-2">Assumption</th>
              <th>Value</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {assumptionsMeta.map((a) => (
              <tr key={a.label} className="border-t border-atlas-border/50">
                <td className="py-2">{a.label}</td>
                <td className="font-mono">{a.value || "—"}</td>
                <td className="text-atlas-muted">{a.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Collapsible>

      <Collapsible
        title="Break-even calculator"
        open={breakEvenOpen}
        onToggle={() => setBreakEvenOpen((o) => !o)}
      >
        <p className="text-sm text-atlas-muted">
          At the current charter rate and payback percentage, the aircraft breaks even at{" "}
          <strong className="text-atlas-text">
            {breakEvenBase != null ? `${breakEvenBase} charter block hours` : "—"}
          </strong>{" "}
          per year (base case).
        </p>
      </Collapsible>
    </div>
  );
}

function PlTable({
  results,
  period,
}: {
  results: ScenarioProFormaResult[];
  period: "annual" | "monthly";
}) {
  const cols = [0, 1, 2].map((i) => results.find((r) => r.scenarioIndex === i));
  const amt = (n: number) => formatCurrency(period === "monthly" ? n / 12 : n);

  const rows: { label: string; values: (number | null)[]; section?: boolean }[] = [
    { label: "NET REVENUE", values: [], section: true },
    { label: "Charter Revenue (Block Time)", values: cols.map((c) => c?.charterRevenue ?? null) },
    { label: "Fuel Surcharge", values: cols.map((c) => c?.fuelSurchargeRevenue ?? null) },
    { label: "Total Net Revenue", values: cols.map((c) => c?.totalRevenue ?? null) },
    { label: "FIXED OWNERSHIP COSTS", values: [], section: true },
    {
      label: "Total Fixed Ownership Costs",
      values: cols.map((c) => {
        const fixed = c?.lineItems.find((l) => l.key === "fixed_costs");
        return fixed ? -Math.abs(fixed.annual) : null;
      }),
    },
    { label: "CHARTER FLIGHT COSTS", values: [], section: true },
    {
      label: "Total Charter Flight Costs",
      values: cols.map((c) => (c ? -Math.abs(c.charterVariableCost) : null)),
    },
    {
      label: "Net Aircraft Operating Profit/Loss",
      values: cols.map((c) => c?.netBeforeOwner ?? null),
    },
    { label: "OWNER FLIGHT COSTS", values: [], section: true },
    {
      label: "Total Owner Flight Costs",
      values: cols.map((c) => (c ? -Math.abs(c.ownerVariableCost) : null)),
    },
    { label: "NET ANNUAL OWNER COST", values: cols.map((c) => c?.netAnnualCost ?? null) },
    { label: "NET MONTHLY OWNER COST", values: cols.map((c) => c?.netMonthlyCost ?? null) },
    { label: "COST PER OWNER FLIGHT HOUR", values: cols.map((c) => c?.costPerOwnerHour ?? null) },
  ];

  return (
    <div className="mb-6 overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse font-mono text-sm tabular-nums">
        <thead>
          <tr className="border-b border-atlas-border text-xs uppercase text-atlas-muted">
            <th className="py-2 pr-4 text-left font-sans">P&amp;L</th>
            {["A", "B (Base)", "C"].map((l, i) => (
              <th
                key={l}
                className={`px-3 py-2 text-right font-sans ${
                  i === 1 ? "border-x-2 border-atlas-accent bg-atlas-accent/5" : ""
                }`}
              >
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) =>
            row.section ? (
              <tr key={row.label} className="bg-atlas-surface/50">
                <td colSpan={4} className="py-2 pr-4 text-xs font-sans font-medium uppercase text-atlas-accent">
                  {row.label}
                </td>
              </tr>
            ) : (
              <tr key={row.label} className="border-b border-atlas-border/40">
                <td className="py-2 pr-4 font-sans text-atlas-muted">{row.label}</td>
                {row.values.map((v, i) => (
                  <td
                    key={i}
                    className={`px-3 py-2 text-right ${
                      i === 1 ? "border-x-2 border-atlas-accent/50 bg-atlas-accent/5" : ""
                    }`}
                  >
                    {v != null ? amt(v) : "—"}
                  </td>
                ))}
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

function InputRow({
  label,
  values,
  field,
  onChange,
  highlightCol,
}: {
  label: string;
  values: ScenarioInput[];
  field: keyof ScenarioInput;
  onChange: (index: number, field: keyof ScenarioInput, value: number) => void;
  highlightCol: number;
}) {
  return (
    <tr className="border-b border-atlas-border/40">
      <td className="py-2 text-atlas-muted">{label}</td>
      {values.map((s, i) => (
        <td
          key={s.scenarioIndex}
          className={`px-2 py-2 ${i === highlightCol ? "border-x-2 border-atlas-accent/50" : ""}`}
        >
          <input
            type="number"
            className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1 font-mono text-sm"
            value={s[field] as number}
            onChange={(e) => onChange(i, field, parseFloat(e.target.value) || 0)}
          />
        </td>
      ))}
    </tr>
  );
}

function Collapsible({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4 rounded-lg border border-atlas-border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-atlas-text"
      >
        {title}
        <span className="text-atlas-muted">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="border-t border-atlas-border px-4 py-3">{children}</div>}
    </div>
  );
}
