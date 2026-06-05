import type { AssumptionMap } from "@/lib/assumptions";
import {
  parseAllocationMode,
  OWNER_EXPENSE_ALLOCATION_KEY,
  type OwnerExpenseAllocationMode,
} from "@/lib/owner-expense-allocation";
import { syncUtilizationHours } from "@/lib/proforma-utilization";

export type ProposalOwnerProfile = {
  id?: string;
  sortOrder: number;
  displayName: string;
  annualFlightHours: number;
  ownershipPercent: number;
};

export const MAX_OWNER_COUNT = 6;

export function totalOwnerFlightHours(profiles: ProposalOwnerProfile[]): number {
  return profiles.reduce(
    (s, p) => s + (Number.isFinite(p.annualFlightHours) ? p.annualFlightHours : 0),
    0
  );
}

export function normalizeProfilesForCount(
  count: number,
  existing: ProposalOwnerProfile[]
): ProposalOwnerProfile[] {
  const n = Math.max(1, Math.min(MAX_OWNER_COUNT, Math.round(count)));
  const out: ProposalOwnerProfile[] = [];
  for (let i = 0; i < n; i++) {
    const prev = existing[i];
    out.push({
      id: prev?.id,
      sortOrder: i,
      displayName: prev?.displayName?.trim() || `Owner ${i + 1}`,
      annualFlightHours: prev?.annualFlightHours ?? (i === 0 ? 400 : 0),
      ownershipPercent:
        n === 1 ? 100 : (prev?.ownershipPercent ?? Math.round((100 / n) * 100) / 100),
    });
  }
  if (n > 1) {
    const sum = out.reduce((s, p) => s + p.ownershipPercent, 0);
    const drift = 100 - sum;
    if (Math.abs(drift) >= 0.01) {
      out[n - 1] = {
        ...out[n - 1],
        ownershipPercent: Math.max(0, out[n - 1].ownershipPercent + drift),
      };
    }
  }
  return out;
}

export function profileFromLegacyAssumptions(assumptions: AssumptionMap): ProposalOwnerProfile[] {
  const hours = parseFloat(assumptions.owner_annual_hours ?? "400");
  return [
    {
      sortOrder: 0,
      displayName: "Owner 1",
      annualFlightHours: Number.isFinite(hours) ? hours : 400,
      ownershipPercent: 100,
    },
  ];
}

export function getAllocationMode(assumptions: AssumptionMap): OwnerExpenseAllocationMode {
  return parseAllocationMode(assumptions[OWNER_EXPENSE_ALLOCATION_KEY]);
}

export type OwnerValidation = {
  ok: boolean;
  equitySum: number;
  totalHours: number;
  maxHours: number;
  messages: string[];
};

export function validateOwnerProfiles(
  profiles: ProposalOwnerProfile[],
  maxAnnualUtilization: number,
  requireEquitySum = true
): OwnerValidation {
  const messages: string[] = [];
  const totalHours = totalOwnerFlightHours(profiles);
  const maxHours = maxAnnualUtilization > 0 ? maxAnnualUtilization : 0;
  const equitySum = profiles.reduce((s, p) => s + p.ownershipPercent, 0);

  if (profiles.length > 1 && requireEquitySum && Math.abs(equitySum - 100) > 0.5) {
    messages.push(`Ownership % must total 100 (currently ${equitySum.toFixed(1)}%)`);
  }
  if (maxHours > 0 && totalHours > maxHours) {
    messages.push(`Total owner hours (${totalHours}) exceed max annual usage (${maxHours})`);
  }
  for (const p of profiles) {
    if (!p.displayName.trim()) messages.push("Each owner needs a name");
    if (p.annualFlightHours < 0) messages.push(`${p.displayName}: hours cannot be negative`);
  }

  return {
    ok: messages.length === 0,
    equitySum,
    totalHours,
    maxHours,
    messages,
  };
}

/** Merge owner profiles into assumptions and sync utilization hour keys. */
export function syncOwnersIntoAssumptions(
  assumptions: AssumptionMap,
  profiles: ProposalOwnerProfile[],
  allocationMode?: OwnerExpenseAllocationMode
): AssumptionMap {
  const total = totalOwnerFlightHours(profiles);
  let next: AssumptionMap = {
    ...assumptions,
    owner_annual_hours: String(total),
  };
  if (allocationMode) {
    next[OWNER_EXPENSE_ALLOCATION_KEY] = allocationMode;
  }
  next = syncUtilizationHours(next);
  return next;
}

export function serializeProfilesForApi(profiles: ProposalOwnerProfile[]) {
  return profiles.map((p, i) => ({
    id: p.id,
    sortOrder: i,
    displayName: p.displayName.trim(),
    annualFlightHours: p.annualFlightHours,
    ownershipPercent: p.ownershipPercent,
  }));
}
