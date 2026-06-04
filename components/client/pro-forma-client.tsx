"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

interface ClientProFormaData {
  editableFields: {
    aircraftValue: { value: number };
    ownerAnnualHours: { value: number };
  };
  baseMetrics: {
    aircraftValue: number;
    ownerHours: number;
  };
  proForma: {
    netAnnualCost: number;
    netMonthlyCost: number;
    costPerOwnerHour: number;
    lineItems: Array<{ key: string; label: string; category: string; annual: number; monthly: number }>;
  };
  fixedCostBreakdown: Array<{ label: string; annual: number; monthly: number }>;
}

export function ProFormaClient({ slug, initial }: { slug: string; initial: ClientProFormaData }) {
  const [period, setPeriod] = useState<"annual" | "monthly">("annual");
  const [aircraftValue, setAircraftValue] = useState(initial.editableFields.aircraftValue.value);
  const [ownerHours, setOwnerHours] = useState(initial.editableFields.ownerAnnualHours.value);
  const [data, setData] = useState(initial);
  const [expanded, setExpanded] = useState<string | null>(null);

  const recalculate = useCallback(async () => {
    const res = await fetch(`/api/portal/${slug}/scenario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aircraftValue, ownerHours }),
    });
    if (res.ok) {
      const updated = await res.json();
      setData(updated);
    }
  }, [slug, aircraftValue, ownerHours]);

  useEffect(() => {
    const t = setTimeout(recalculate, 500);
    return () => clearTimeout(t);
  }, [recalculate]);

  function restore() {
    setAircraftValue(initial.baseMetrics.aircraftValue);
    setOwnerHours(initial.baseMetrics.ownerHours);
  }

  const val = (annual: number, monthly: number) =>
    period === "annual" ? annual : monthly;

  const summaryRows = [
    { key: "fixed", label: "Fixed Ownership Costs", annual: data.fixedCostBreakdown.reduce((s, i) => s + i.annual, 0) },
    {
      key: "owner",
      label: "Owner Flight Costs",
      annual: data.proForma.lineItems.find((l) => l.key === "owner_variable")?.annual ?? 0,
    },
    {
      key: "charter_rev",
      label: "Charter Revenue Offset",
      annual: -(data.proForma.lineItems.find((l) => l.key === "total_revenue")?.annual ?? 0),
    },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-3xl">Atlas Pro Forma</h1>
        <div className="flex rounded-lg border border-atlas-border p-1">
          {(["annual", "monthly"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-md px-4 py-2 text-sm capitalize ${
                period === p ? "bg-atlas-accent text-atlas-bg" : "text-atlas-muted"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <p className="max-w-2xl text-atlas-muted">
        The pro forma below is designed to provide a practical estimate of annual and monthly aircraft
        ownership economics. Adjust aircraft value and owner hours to explore scenarios.
      </p>

      <div className="grid gap-6 sm:grid-cols-2 max-w-xl">
        <div className="space-y-2">
          <Label>Aircraft Value</Label>
          <Input
            type="number"
            value={aircraftValue}
            onChange={(e) => setAircraftValue(Number(e.target.value))}
            className="font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label>Owner Annual Hours</Label>
          <Input
            type="number"
            value={ownerHours}
            onChange={(e) => setOwnerHours(Number(e.target.value))}
            className="font-mono"
          />
        </div>
      </div>

      <Button variant="secondary" onClick={restore}>
        Restore to PrismJet Assumptions
      </Button>

      <div className="rounded-lg border border-atlas-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-atlas-surface text-atlas-muted">
            <tr>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-right">{period === "annual" ? "Annual" : "Monthly"}</th>
            </tr>
          </thead>
          <tbody>
            {summaryRows.map((row) => (
              <Fragment key={row.key}>
                <tr
                  className="border-t border-atlas-border cursor-pointer hover:bg-atlas-surface/50"
                  onClick={() => setExpanded(expanded === row.key ? null : row.key)}
                >
                  <td className="px-4 py-3">{row.label}</td>
                  <td
                    className={`px-4 py-3 text-right font-mono tabular-nums ${
                      row.annual < 0 ? "text-atlas-success" : ""
                    }`}
                  >
                    {row.annual < 0 ? "(" : ""}
                    {formatCurrency(Math.abs(val(row.annual, row.annual / 12)))}
                    {row.annual < 0 ? ")" : ""}
                  </td>
                </tr>
                {expanded === "fixed" && row.key === "fixed" && (
                  <tr>
                    <td colSpan={2} className="bg-atlas-surface/30 px-6 py-3">
                      <ul className="space-y-1 text-atlas-muted">
                        {data.fixedCostBreakdown.map((item) => (
                          <li key={item.label} className="flex justify-between font-mono text-xs">
                            <span>{item.label}</span>
                            <span>{formatCurrency(val(item.annual, item.monthly))}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            <tr className="border-t border-atlas-border bg-atlas-surface/50 font-semibold">
              <td className="px-4 py-4">Net {period === "annual" ? "Annual" : "Monthly"} Cost</td>
              <td className="px-4 py-4 text-right font-mono text-lg text-atlas-accent tabular-nums">
                {formatCurrency(
                  val(data.proForma.netAnnualCost, data.proForma.netMonthlyCost)
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
