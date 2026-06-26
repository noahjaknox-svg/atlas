import type { AssumptionMap } from "@/lib/assumptions";
import {
  parseAllocationMode,
  OWNER_EXPENSE_ALLOCATION_KEY,
  type OwnerExpenseAllocationMode,
} from "@/lib/owner-expense-allocation";
import { patchAssumptionsWithCrewStep } from "@/lib/crew-step";
import { syncUtilizationHours } from "@/lib/proforma-utilization";

export type ProposalOwnerProfile = {
  id?: string;
  sortOrder: number;
  displayName: string;
  annualFlightHours: number;
  ownershipPercent: number;
};

export const MAX_OWNER_COUNT = 6;

export const OWNER_PROFORMA_HOURS_KEY = "owner_proforma_hours_json";

export function totalOwnerFlightHours(profiles: ProposalOwnerProfile[]): number {
  return profiles.reduce(
    (s, p) => s + (Number.isFinite(p.annualFlightHours) ? p.annualFlightHours : 0),
    0
  );
}

export function parseProformaOwnerHoursJson(
  assumptions: AssumptionMap,
  profileCount: number
): number[] | null {
  const raw = assumptions[OWNER_PROFORMA_HOURS_KEY];
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const nums = parsed.map((v) => {
      const n = typeof v === "number" ? v : parseFloat(String(v));
      return Number.isFinite(n) && n >= 0 ? n : 0;
    });
    if (profileCount > 0 && nums.length !== profileCount) return null;
    return nums;
  } catch {
    return null;
  }
}

/** Pro forma scenario hours per owner (aligned to profile sortOrder). */
export function proformaHoursForProfiles(
  profiles: ProposalOwnerProfile[],
  assumptions: AssumptionMap
): number[] {
  if (profiles.length === 1) {
    const fromAnnual = parseFloat(assumptions.owner_annual_hours ?? "");
    if (Number.isFinite(fromAnnual) && fromAnnual >= 0) {
      return [fromAnnual];
    }
    const stored = parseProformaOwnerHoursJson(assumptions, 1);
    if (stored) return stored;
    return [profiles[0]?.annualFlightHours ?? 400];
  }

  const stored = parseProformaOwnerHoursJson(assumptions, profiles.length);
  if (stored) return stored;

  return profiles.map((p) =>
    Number.isFinite(p.annualFlightHours) ? p.annualFlightHours : 0
  );
}

/** Seed pro forma hours from owner profile defaults (Owners tab). */
export function seedProformaHoursInAssumptions(
  assumptions: AssumptionMap,
  profiles: ProposalOwnerProfile[]
): AssumptionMap {
  const hours = profiles.map((p) =>
    Number.isFinite(p.annualFlightHours) ? p.annualFlightHours : 0
  );
  const total = hours.reduce((s, h) => s + h, 0);
  const next: AssumptionMap = {
    ...assumptions,
    [OWNER_PROFORMA_HOURS_KEY]: JSON.stringify(hours),
    owner_annual_hours: String(total),
  };
  return syncUtilizationHours(next);
}

export function patchProformaOwnerHoursAtIndex(
  assumptions: AssumptionMap,
  profiles: ProposalOwnerProfile[],
  index: number,
  hours: number
): AssumptionMap {
  const current = proformaHoursForProfiles(profiles, assumptions);
  const next = [...current];
  next[index] = Math.max(0, hours);
  const total = next.reduce((s, h) => s + h, 0);
  const updated: AssumptionMap = {
    ...assumptions,
    [OWNER_PROFORMA_HOURS_KEY]: JSON.stringify(next),
    owner_annual_hours: String(total),
  };
  return syncUtilizationHours(updated);
}

/** Profiles with annualFlightHours replaced by pro forma scenario hours. */
export function profilesWithProformaHours(
  profiles: ProposalOwnerProfile[],
  assumptions: AssumptionMap
): ProposalOwnerProfile[] {
  const hours = proformaHoursForProfiles(profiles, assumptions);
  return profiles.map((p, i) => ({
    ...p,
    annualFlightHours: hours[i] ?? p.annualFlightHours,
  }));
}

export function ownerDefaultHoursChanged(
  prev: ProposalOwnerProfile[],
  next: ProposalOwnerProfile[]
): boolean {
  if (prev.length !== next.length) return true;
  return next.some((p, i) => {
    const a = prev[i]?.annualFlightHours ?? 0;
    const b = p.annualFlightHours ?? 0;
    return a !== b;
  });
}

/** Owner hours that drive crew step / utilization (from pro forma assumptions). */
export function ownerHoursForUtilization(
  profiles: ProposalOwnerProfile[],
  assumptions: AssumptionMap
): number {
  return proformaHoursForProfiles(profiles, assumptions).reduce((s, h) => s + h, 0);
}

export function normalizeProfilesForCount(
  count: number,
  existing: ProposalOwnerProfile[],
  defaultHours = 400
): ProposalOwnerProfile[] {
  const n = Math.max(1, Math.min(MAX_OWNER_COUNT, Math.round(count)));
  const out: ProposalOwnerProfile[] = [];
  for (let i = 0; i < n; i++) {
    const prev = existing[i];
    out.push({
      id: prev?.id,
      sortOrder: i,
      displayName: prev?.displayName?.trim() || `Owner ${i + 1}`,
      annualFlightHours: prev?.annualFlightHours ?? (i === 0 ? defaultHours : 0),
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

/** Validate pro forma scenario hours (not owner profile defaults). */
export function validateProformaOwnerHours(
  profiles: ProposalOwnerProfile[],
  assumptions: AssumptionMap,
  maxAnnualUtilization: number
): OwnerValidation {
  return validateOwnerProfiles(
    profilesWithProformaHours(profiles, assumptions),
    maxAnnualUtilization,
    false
  );
}

/** Seed pro forma from owner defaults and recompute crew step / utilization. */
export function assumptionsAfterOwnerDefaultsChange(
  base: AssumptionMap,
  profiles: ProposalOwnerProfile[],
  allocationMode: OwnerExpenseAllocationMode | undefined,
  warehouseDefaults: Record<string, string> = {},
  seedProforma = true
): AssumptionMap {
  let next: AssumptionMap = { ...base };
  if (allocationMode) {
    next[OWNER_EXPENSE_ALLOCATION_KEY] = allocationMode;
  }
  if (!seedProforma) {
    return next;
  }
  next = seedProformaHoursInAssumptions(next, profiles);
  const hours = ownerHoursForUtilization(profiles, next);
  return patchAssumptionsWithCrewStep(next, warehouseDefaults, { ownerHours: hours });
}

/** @deprecated Use assumptionsAfterOwnerDefaultsChange */
export function assumptionsAfterOwnerUpdate(
  base: AssumptionMap,
  profiles: ProposalOwnerProfile[],
  allocationMode: OwnerExpenseAllocationMode | undefined,
  warehouseDefaults: Record<string, string> = {}
): AssumptionMap {
  return assumptionsAfterOwnerDefaultsChange(
    base,
    profiles,
    allocationMode,
    warehouseDefaults,
    true
  );
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

/** Parse equity % while editing; empty/invalid returns null (do not commit yet). */
export function parseEquityPercentInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = parseFloat(trimmed);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function formatEquityPercentDisplay(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return String(value);
}

/**
 * After a persist response: apply saved rows only if local state wasn't edited
 * during the request; otherwise keep local values and merge server ids only.
 */
export function mergeOwnerProfilesAfterPersist(
  local: ProposalOwnerProfile[],
  saved: ProposalOwnerProfile[],
  applySavedValues: boolean
): ProposalOwnerProfile[] {
  if (applySavedValues) return saved;
  return local.map((profile, index) => ({
    ...profile,
    id: saved[index]?.id ?? profile.id,
  }));
}
