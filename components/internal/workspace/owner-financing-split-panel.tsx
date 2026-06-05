"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import type { AssumptionMap } from "@/lib/assumptions";
import { buildPerOwnerFinancing } from "@/lib/proforma-multi-owner";
import type { OwnerExpenseAllocationMode } from "@/lib/owner-expense-allocation";
import { getAllocationMode } from "@/lib/proposal-owners";
import type { ProposalOwnerProfile } from "@/lib/proposal-owners";

export function OwnerFinancingSplitPanel({
  assumptions,
  profiles,
  allocationMode,
}: {
  assumptions: AssumptionMap;
  profiles: ProposalOwnerProfile[];
  allocationMode?: OwnerExpenseAllocationMode;
}) {
  const rows = useMemo(
    () =>
      buildPerOwnerFinancing(
        assumptions,
        profiles,
        allocationMode ?? getAllocationMode(assumptions)
      ),
    [assumptions, profiles, allocationMode]
  );

  if (rows.length === 0) return null;

  return (
    <div className="rounded-lg border border-atlas-border/80 bg-atlas-surface/20 p-4">
      <p className="atlas-section-title text-sm">Owner capital &amp; debt split</p>
      <p className="atlas-caption mt-1 text-atlas-muted">
        Implied equity and allocated monthly debt service by ownership share.
      </p>
      <div className="mt-4 overflow-hidden rounded-md border border-atlas-border/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-atlas-border/60 bg-atlas-bg/40">
              <th className="px-3 py-2 text-left atlas-kicker font-normal">Owner</th>
              <th className="px-3 py-2 text-right atlas-kicker font-normal">Equity %</th>
              <th className="px-3 py-2 text-right atlas-kicker font-normal">Implied equity</th>
              <th className="px-3 py-2 text-right atlas-kicker font-normal">Monthly debt</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.profile.sortOrder} className="border-b border-atlas-border/40 last:border-b-0">
                <td className="px-3 py-2">{r.profile.displayName}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {r.ownershipPercent.toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {formatCurrency(r.impliedEquity)}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {formatCurrency(r.monthlyDebtService)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
