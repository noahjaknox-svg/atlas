import type { AssumptionMap } from "@/lib/assumptions";

function num(v: string | undefined, fallback = 0): number {
  const n = parseFloat(v ?? "");
  return Number.isFinite(n) ? n : fallback;
}

export type ResolvedFinancingAmounts = {
  downPayment: number;
  loanAmount: number;
  principal: number;
};

/** Down payment and financed principal from aircraft value + template percent. */
export function resolveFinancingAmounts(a: AssumptionMap): ResolvedFinancingAmounts {
  const aircraftValue = num(a.aircraft_value);
  const pct = num(a.down_payment_percent);
  const storedDown = num(a.down_payment);
  const storedLoan = num(a.loan_amount);

  if (aircraftValue > 0 && pct > 0) {
    const downPayment = Math.round(aircraftValue * (pct / 100));
    const loanAmount = Math.max(0, aircraftValue - downPayment);
    return { downPayment, loanAmount, principal: loanAmount };
  }

  if (storedLoan > 0) {
    const downPayment = storedDown;
    const principal = Math.max(0, storedLoan - downPayment);
    return { downPayment, loanAmount: principal, principal };
  }

  if (aircraftValue > 0 && storedDown > 0) {
    const loanAmount = Math.max(0, aircraftValue - storedDown);
    return { downPayment: storedDown, loanAmount, principal: loanAmount };
  }

  return { downPayment: storedDown, loanAmount: storedLoan, principal: Math.max(0, storedLoan) };
}

export function applyFinancingDerivations(a: AssumptionMap): Partial<AssumptionMap> {
  if (a.financing_enabled !== "yes") return {};
  const aircraftValue = num(a.aircraft_value);
  if (aircraftValue <= 0) return {};
  const { downPayment, loanAmount } = resolveFinancingAmounts(a);
  return {
    down_payment: String(downPayment),
    loan_amount: String(loanAmount),
  };
}
