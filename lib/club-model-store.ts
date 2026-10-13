import { z } from "zod";
import {
  CLUB_DEFAULTS,
  computeClubModel,
  withInputs,
  type ClubInputs,
  type ClubOwnerView,
  type ClubPrismjetView,
} from "@/lib/club-proforma";

/**
 * Persistence for the membership-club model. Inputs live in ONE hidden proposal
 * assumption row (no schema migration); only a proposal that has this row gets a
 * `clubModel` in its published snapshot, so every other proposal is untouched.
 */
export const CLUB_MODEL_CATEGORY = "club_model";
export const CLUB_INPUTS_KEY = "club_inputs_json";

const num = z.number().finite();
const pct = z.number().finite().min(0).max(1);

const inputsSchema = z
  .object({
    assetCost: num.positive(),
    downPaymentPct: pct,
    interestRate: pct,
    termYears: num.positive().max(40),
    fixedAnnualCostPerAircraft: num.min(0),
    directCostPerFlightHour: num.min(0),
    annualCapacityHours: num.positive(),
    occupancyRate: pct.refine((v) => v > 0),
    conformityMonths: num.min(0).max(24),
    maxAircraft: num.int().min(1).max(12),
    initiationFee: num.min(0),
    monthlyDues: num.min(0),
    blockHourRate: num.min(0),
    allocationHours: num.positive(),
    flownHoursPerMember: num.min(0),
    overageMarkup: num.min(0).max(5),
    offFleetOccupiedRate: num.min(0),
    operatingSharePct: pct,
    operatingShareBasis: z.enum(["gross", "flight"]),
    directCostBasis: z.enum(["occupied", "occupied_over_occupancy"]),
    foundingMembers: num.int().min(0),
    membersPerYear: num.min(0),
    memberCap: num.int().min(1).max(200).optional(),
    acquisitionMonths: z.array(num.int().min(1)).max(12).optional(),
    licenceFee: num.min(0),
    royaltyPct: pct,
    jvSilverleafPct: pct,
    ownerFinancedSilverleafPct: pct,
    bridgeDownPayments: z.object({
      licensing: num.min(0),
      jv: num.min(0),
      ownerFinanced: num.min(0),
    }),
    interimLiftRates: z.array(num.positive()).max(8),
    deadheadRatios: z.array(pct).max(4),
  })
  .partial();

/** Tolerant parse: unknown / invalid fields fall back to defaults; never throws. */
export function parseClubInputs(raw: string | null | undefined): ClubInputs {
  if (!raw?.trim()) return { ...CLUB_DEFAULTS };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ...CLUB_DEFAULTS };
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) return { ...CLUB_DEFAULTS };

  // Validate field by field so one bad value doesn't discard the rest.
  const shape = inputsSchema.shape as Record<string, z.ZodTypeAny>;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(json as Record<string, unknown>)) {
    const field = shape[key];
    if (!field) continue;
    const res = field.safeParse(value);
    if (res.success) clean[key] = res.data;
  }
  return withInputs(clean as Partial<ClubInputs>);
}

export function serializeClubInputs(inputs: ClubInputs): string {
  return JSON.stringify(inputs);
}

/** Validate a partial update from the staff panel. Returns issues instead of throwing. */
export function validateClubInputsPatch(
  patch: unknown
): { ok: true; value: Partial<ClubInputs> } | { ok: false; error: string } {
  const res = inputsSchema.strict().safeParse(patch);
  if (!res.success) {
    const issue = res.error.issues[0];
    return { ok: false, error: `${issue.path.join(".") || "inputs"}: ${issue.message}` };
  }
  return { ok: true, value: res.data as Partial<ClubInputs> };
}

export type ClubSnapshot = {
  version: 1;
  inputs: ClubInputs;
  /**
   * Frozen at publish. `result.prismjet` is server-only: client-facing loaders strip it
   * (see `sanitizeSnapshotForClient`) unless the PrismJet economics page is visible.
   */
  result: { owner: ClubOwnerView; prismjet?: ClubPrismjetView };
};

export function buildClubSnapshot(inputs: ClubInputs): ClubSnapshot {
  return { version: 1, inputs, result: computeClubModel(inputs) };
}

/** Find the stored inputs row among a proposal's assumptions, if the proposal has a club model. */
export function findClubInputsRow<T extends { category: string; assumptionName: string; value: string }>(
  rows: readonly T[]
): T | undefined {
  return rows.find(
    (r) => r.category === CLUB_MODEL_CATEGORY && r.assumptionName === CLUB_INPUTS_KEY
  );
}
