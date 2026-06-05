import type { ProposalOwnerProfile } from "@/lib/proposal-owners";

export type OwnerExpenseAllocationMode =
  | "hybrid"
  | "equity"
  | "equal"
  | "flight_hours";

export const OWNER_EXPENSE_ALLOCATION_KEY = "owner_expense_allocation_mode";

export const ALLOCATION_MODE_OPTIONS: {
  value: OwnerExpenseAllocationMode;
  label: string;
}[] = [
  { value: "hybrid", label: "Hybrid — fixed & charter by equity %, variable by flight hours" },
  { value: "equity", label: "All costs by ownership %" },
  { value: "equal", label: "Equal split across owners" },
  { value: "flight_hours", label: "All costs by flight-hour share" },
];

export function parseAllocationMode(raw: string | undefined): OwnerExpenseAllocationMode {
  if (raw === "equity" || raw === "equal" || raw === "flight_hours" || raw === "hybrid") {
    return raw;
  }
  return "hybrid";
}

export type AllocationLineCategory =
  | "revenue"
  | "fixed"
  | "charter_variable"
  | "owner_variable"
  | "net_before_owner"
  | "financing";

/** Share of a pooled aircraft amount for one owner (0–1). */
export function ownerAllocationShare(
  profile: ProposalOwnerProfile,
  profiles: ProposalOwnerProfile[],
  mode: OwnerExpenseAllocationMode,
  line: AllocationLineCategory
): number {
  const n = profiles.length;
  if (n === 0) return 0;

  const equity = profile.ownershipPercent / 100;
  const totalHours = profiles.reduce((s, p) => s + p.annualFlightHours, 0);
  const hourShare =
    totalHours > 0 && profile.annualFlightHours > 0
      ? profile.annualFlightHours / totalHours
      : 0;

  switch (mode) {
    case "equal":
      return 1 / n;
    case "equity":
      return equity;
    case "flight_hours":
      return hourShare;
    case "hybrid":
    default:
      if (line === "owner_variable") return hourShare;
      if (line === "financing") return equity;
      return equity;
  }
}

export function allocatePoolAmount(
  total: number,
  profile: ProposalOwnerProfile,
  profiles: ProposalOwnerProfile[],
  mode: OwnerExpenseAllocationMode,
  line: AllocationLineCategory
): number {
  return total * ownerAllocationShare(profile, profiles, mode, line);
}
