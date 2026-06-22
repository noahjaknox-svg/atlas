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
    <section className="atlas-workspace-section">
      <div className="atlas-workspace-section-header">
        <h3 className="atlas-panel-title">Owner capital &amp; debt split</h3>
        <p className="atlas-caption mt-1 text-atlas-muted">
          Implied equity and allocated monthly debt service by ownership share.
        </p>
      </div>
      <div className="atlas-workspace-section-body pt-0">
        <div className="overflow-hidden rounded-md border border-atlas-border/60">
          <table className="atlas-data-table">
            <thead>
              <tr>
                <th>Owner</th>
                <th className="text-right">Equity %</th>
                <th className="text-right">Implied equity</th>
                <th className="text-right">Monthly debt</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.profile.sortOrder}>
                  <td>{r.profile.displayName}</td>
                  <td className="text-right font-mono tabular-nums">
                    {r.ownershipPercent.toFixed(1)}%
                  </td>
                  <td className="text-right font-mono tabular-nums">
                    {formatCurrency(r.impliedEquity)}
                  </td>
                  <td className="text-right font-mono tabular-nums">
                    {formatCurrency(r.monthlyDebtService)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
