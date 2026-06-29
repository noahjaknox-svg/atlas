import { describe, expect, it } from "vitest";
import {
  applyFinancingDerivations,
  resolveFinancingAmounts,
} from "@/lib/financing-assumptions";
import { computeMonthlyDebtService } from "@/lib/aircraft-calculated-fields";
import type { AssumptionMap } from "@/lib/assumptions";

describe("financing-assumptions", () => {
  it("derives down payment and loan from aircraft value and percent", () => {
    const a: AssumptionMap = {
      aircraft_value: "5000000",
      down_payment_percent: "20",
    };
    const amounts = resolveFinancingAmounts(a);
    expect(amounts.downPayment).toBe(1_000_000);
    expect(amounts.loanAmount).toBe(4_000_000);
    expect(amounts.principal).toBe(4_000_000);
  });

  it("applyFinancingDerivations only when financing is enabled", () => {
    const disabled: AssumptionMap = {
      aircraft_value: "5000000",
      down_payment_percent: "20",
      financing_enabled: "no",
    };
    expect(applyFinancingDerivations(disabled)).toEqual({});

    const enabled: AssumptionMap = {
      aircraft_value: "5000000",
      down_payment_percent: "20",
      financing_enabled: "yes",
    };
    expect(applyFinancingDerivations(enabled)).toEqual({
      down_payment: "1000000",
      loan_amount: "4000000",
    });
  });

  it("computes monthly debt service from derived principal", () => {
    const a: AssumptionMap = {
      financing_enabled: "yes",
      aircraft_value: "1000000",
      down_payment_percent: "10",
      interest_rate: "6",
      term_months: "120",
      balloon_payment: "0",
    };
    const derived = applyFinancingDerivations(a);
    const monthly = computeMonthlyDebtService({ ...a, ...derived });
    expect(monthly).toBeGreaterThan(0);
    expect(monthly).toBeLessThan(20_000);
  });
});
