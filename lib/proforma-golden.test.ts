import { describe, expect, it } from "vitest";
import fixtures from "@/lib/__fixtures__/proforma-golden-assumptions.json";
import { buildProFormaStatement } from "@/lib/proforma-statement";
import { applyProFormaVisibility, parseProFormaVisibility } from "@/lib/proforma-line-visibility";
import { computeTotalFixedFromAssumptions } from "@/lib/proforma";
import { computeWorkspaceProFormaForClient } from "@/lib/workspace-proforma-client";
import type { AssumptionMap } from "@/lib/assumptions";

/**
 * Golden master for the pro forma engine: 36 real (anonymized) staging aircraft.
 * Captured before the Line Items catalog refactor — any change in these numbers
 * means existing proposals or published portals would show different figures.
 * Regenerate ONLY for an intentional calculation change: `npx vitest run -u lib/proforma-golden.test.ts`.
 */
function round(value: unknown): unknown {
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value * 1e4) / 1e4 : String(value);
  if (Array.isArray(value)) return value.map(round);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, round(v)]));
  }
  return value;
}

describe("pro forma golden master", () => {
  for (const { id, assumptions } of fixtures as Array<{ id: string; assumptions: AssumptionMap }>) {
    it(id, async () => {
      const statement = buildProFormaStatement(assumptions);
      const visible = applyProFormaVisibility(
        statement.rows,
        parseProFormaVisibility(assumptions),
        statement.utilization.ownerFlightHours,
        assumptions
      );
      const client = computeWorkspaceProFormaForClient(assumptions);
      await expect(
        JSON.stringify(
          round({
            statementRows: statement.rows,
            visibleRows: visible,
            totalFixed: computeTotalFixedFromAssumptions(assumptions),
            client: {
              metrics: client.metrics,
              proForma: client.proForma,
              fixedCostBreakdown: client.fixedCostBreakdown,
              summaryRows: client.summaryRows,
              statementRows: client.statementRows,
            },
          }),
          null,
          1
        )
      ).toMatchFileSnapshot(`./__fixtures__/golden/${id}.json`);
    });
  }
});
