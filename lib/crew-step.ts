import type { AssumptionMap } from "@/lib/assumptions";
import { syncUtilizationHours } from "@/lib/proforma-utilization";
import { mergeAssumptionsWithDefaults } from "@/lib/resolve-effective-assumptions";

export type CrewComposition = {
  pic: number;
  sic: number;
};

export type UsageTiers = [
  number,
  number,
  number,
  number,
  number,
  number,
];

const MAX_PILOT_TIER = 6;

function num(v: string | undefined, fallback = 0): number {
  const n = parseFloat(v ?? "");
  return Number.isFinite(n) ? n : fallback;
}

/** PIC/SIC ladder: 1/1 → 2/1 → 2/2 → 3/2 → … (always ≥1 PIC). */
export function buildCrewLadder(maxSteps = 20): CrewComposition[] {
  const ladder: CrewComposition[] = [];
  let pic = 1;
  let sic = 1;
  ladder.push({ pic, sic });

  while (ladder.length < maxSteps) {
    if (pic <= sic) {
      pic += 1;
    } else {
      sic += 1;
    }
    ladder.push({ pic, sic });
  }
  return ladder;
}

export const CREW_LADDER = buildCrewLadder();

export function crewAtStep(stepIndex: number): CrewComposition {
  const idx = Math.max(0, Math.min(stepIndex, CREW_LADDER.length - 1));
  return CREW_LADDER[idx]!;
}

export function isLeadPilotEnabled(a: AssumptionMap): boolean {
  return a.lead_pilot_enabled === "yes";
}

/** Total pilots for max-usage tier lookup (PIC + SIC; lead fills a PIC slot). */
export function totalPilots(crew: CrewComposition, _leadEnabled?: boolean): number {
  const raw = crew.pic + crew.sic;
  return Math.min(MAX_PILOT_TIER, Math.max(1, raw));
}

export function parseUsageTiers(a: AssumptionMap): UsageTiers {
  return [
    num(a.max_usage_1_pilot),
    num(a.max_usage_2_pilots),
    num(a.max_usage_3_pilots),
    num(a.max_usage_4_pilots),
    num(a.max_usage_5_pilots),
    num(a.max_usage_6_pilots),
  ];
}

export function maxUsageForPilots(pilotCount: number, tiers: UsageTiers): number {
  const n = Math.min(MAX_PILOT_TIER, Math.max(1, Math.round(pilotCount)));
  return tiers[n - 1] ?? 0;
}

/** First ladder index whose PIC/SIC meet or exceed warehouse baseline (legacy migration). */
export function warehouseMinStep(baselinePic: number, baselineSic: number): number {
  const pic = Math.max(0, Math.round(baselinePic));
  const sic = Math.max(0, Math.round(baselineSic));
  if (pic === 0 && sic === 0) return 0;

  for (let i = 0; i < CREW_LADDER.length; i++) {
    const rung = CREW_LADDER[i]!;
    if (rung.pic >= Math.max(1, pic) && rung.sic >= sic) {
      return i;
    }
  }
  return CREW_LADDER.length - 1;
}

/** Parse `default_minimum_crew` as minimum total pilots (PIC + SIC). */
export function parseDefaultMinimumPilots(a: AssumptionMap): number | null {
  const raw = a.default_minimum_crew?.trim();
  if (raw === "" || raw == null) return null;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(MAX_PILOT_TIER, n);
}

/** Smallest ladder step whose PIC+SIC total meets or exceeds the target count. */
export function stepIndexForTotalPilots(pilotCount: number): number {
  const target = Math.max(2, Math.min(MAX_PILOT_TIER, Math.round(pilotCount)));
  for (let i = 0; i < CREW_LADDER.length; i++) {
    if (totalPilots(crewAtStep(i)) >= target) return i;
  }
  return CREW_LADDER.length - 1;
}

/** Ladder floor from `default_minimum_crew` (total pilots); step 0 when unset. */
export function parseDefaultMinimumCrewMinStep(a: AssumptionMap): number {
  const pilots = parseDefaultMinimumPilots(a);
  if (pilots == null) return 0;
  return stepIndexForTotalPilots(pilots);
}

/** @deprecated Use parseDefaultMinimumCrewMinStep */
export function parseDefaultMinimumCrewStep(a: AssumptionMap): number {
  return parseDefaultMinimumCrewMinStep(a);
}

/** Merge stored assumptions with warehouse defaults for crew ladder resolution. */
export function mergeAssumptionsForCrewStep(
  assumptions: AssumptionMap,
  warehouseDefaults: Record<string, string> = {}
): AssumptionMap {
  return mergeAssumptionsWithDefaults(assumptions, warehouseDefaults);
}

/** Smallest step ≥ minStep where max usage can cover owner hours. */
export function requiredStepForOwnerHours(
  ownerHours: number,
  tiers: UsageTiers,
  minStep: number,
  leadEnabled: boolean
): number {
  const owner = Math.max(0, ownerHours);
  for (let step = minStep; step < CREW_LADDER.length; step++) {
    const crew = crewAtStep(step);
    const pilots = totalPilots(crew, leadEnabled);
    const maxUsage = maxUsageForPilots(pilots, tiers);
    if (maxUsage <= 0 || owner <= maxUsage) {
      return step;
    }
  }
  return CREW_LADDER.length - 1;
}

export type ResolveCrewStepInput = {
  ownerHours: number;
  userStep?: number;
  minStep?: number;
  tiers: UsageTiers;
  leadEnabled: boolean;
};

export type ResolvedCrewStep = {
  stepIndex: number;
  crew: CrewComposition;
  totalPilots: number;
  maxAnnualUtilization: number;
  requiredStep: number;
  minStep: number;
  leadEnabled: boolean;
};

export function resolveCrewStep(input: ResolveCrewStepInput): ResolvedCrewStep {
  const minStep = input.minStep ?? 0;
  const requiredStep = requiredStepForOwnerHours(
    input.ownerHours,
    input.tiers,
    minStep,
    input.leadEnabled
  );
  const userStep = input.userStep ?? minStep;
  const stepIndex = Math.max(minStep, requiredStep, userStep);
  const crew = crewAtStep(stepIndex);
  const pilots = totalPilots(crew, input.leadEnabled);
  const maxAnnualUtilization = maxUsageForPilots(pilots, input.tiers);

  return {
    stepIndex,
    crew,
    totalPilots: pilots,
    maxAnnualUtilization,
    requiredStep,
    minStep,
    leadEnabled: input.leadEnabled,
  };
}

/** Infer ladder step from stored PIC/SIC counts (migration / legacy). */
export function inferStepFromCounts(pic: number, sic: number): number {
  const p = Math.max(1, Math.round(pic));
  const s = Math.max(0, Math.round(sic));
  for (let i = 0; i < CREW_LADDER.length; i++) {
    const rung = CREW_LADDER[i]!;
    if (rung.pic === p && rung.sic === s) return i;
  }
  return warehouseMinStep(p, s);
}

export function resolveCrewStepFromAssumptions(
  a: AssumptionMap,
  overrides?: { userStep?: number; leadEnabled?: boolean; ownerHours?: number },
  warehouseDefaults: Record<string, string> = {}
): ResolvedCrewStep {
  const merged = mergeAssumptionsForCrewStep(a, warehouseDefaults);
  const tiers = parseUsageTiers(merged);
  const leadEnabled = overrides?.leadEnabled ?? isLeadPilotEnabled(merged);
  const ownerHours = overrides?.ownerHours ?? num(merged.owner_annual_hours);
  const minStep = parseDefaultMinimumCrewMinStep(merged);
  const storedStep = merged.crew_step_index?.trim();
  const ladderPic = leadEnabled
    ? Math.max(1, Math.round(num(merged.pic_count)) + 1)
    : Math.max(1, Math.round(num(merged.pic_count, 1)));
  const userStep =
    overrides?.userStep ??
    (storedStep !== "" && storedStep != null
      ? parseInt(storedStep, 10)
      : inferStepFromCounts(ladderPic, num(merged.sic_count, 1)));

  return resolveCrewStep({
    ownerHours,
    userStep: Number.isFinite(userStep) ? userStep : undefined,
    minStep,
    tiers,
    leadEnabled,
  });
}

/** Recompute crew step + utilization after owner hours or crew controls change. */
export function patchAssumptionsWithCrewStep(
  raw: AssumptionMap,
  warehouseDefaults: Record<string, string>,
  patch: { ownerHours?: number; userStep?: number; leadEnabled?: boolean }
): AssumptionMap {
  const merged = mergeAssumptionsForCrewStep(raw, warehouseDefaults);
  const withPatch: AssumptionMap = { ...merged };
  if (patch.ownerHours !== undefined) {
    withPatch.owner_annual_hours = String(patch.ownerHours);
  }
  if (patch.leadEnabled !== undefined) {
    withPatch.lead_pilot_enabled = patch.leadEnabled ? "yes" : "no";
  }
  const resolved = resolveCrewStepFromAssumptions(withPatch, patch, warehouseDefaults);
  const next: AssumptionMap = { ...raw };
  if (patch.ownerHours !== undefined) {
    next.owner_annual_hours = String(patch.ownerHours);
  }
  if (patch.leadEnabled !== undefined) {
    next.lead_pilot_enabled = patch.leadEnabled ? "yes" : "no";
  }
  return applyCrewStepToAssumptions(next, resolved);
}

/** Write crew step outputs into assumptions and sync utilization hours. */
export function applyCrewStepToAssumptions(
  a: AssumptionMap,
  resolved: ResolvedCrewStep
): AssumptionMap {
  const additionalPic = resolved.leadEnabled
    ? Math.max(0, resolved.crew.pic - 1)
    : resolved.crew.pic;
  const next: AssumptionMap = {
    ...a,
    crew_step_index: String(resolved.stepIndex),
    pic_count: String(additionalPic),
    sic_count: String(resolved.crew.sic),
    lead_pilot_count: resolved.leadEnabled ? "1" : "0",
    lead_pilot_enabled: resolved.leadEnabled ? "yes" : "no",
    max_annual_utilization: String(resolved.maxAnnualUtilization),
  };
  return syncUtilizationHours(next);
}

export function formatCrewComposition(resolved: ResolvedCrewStep): string {
  const parts: string[] = [];
  if (resolved.leadEnabled) {
    parts.push("1 Lead");
    const extraPic = resolved.crew.pic - 1;
    if (extraPic > 0) parts.push(`${extraPic} PIC`);
  } else {
    parts.push(`${resolved.crew.pic} PIC`);
  }
  if (resolved.crew.sic > 0) parts.push(`${resolved.crew.sic} SIC`);
  return parts.join(" · ");
}

export function formatCrewLadderRung(stepIndex: number): string {
  const crew = crewAtStep(stepIndex);
  return `Step ${stepIndex}: ${crew.pic} PIC + ${crew.sic} SIC`;
}

export type CrewLadderReferenceRung = {
  stepIndex: number;
  crew: CrewComposition;
  pilots: number;
  maxUsage: number;
};

/** Static ladder reference: step composition and max annual usage per rung. */
export function crewLadderReferenceRungs(
  assumptions: AssumptionMap,
  warehouseDefaults: Record<string, string> = {},
  maxSteps = CREW_LADDER.length
): CrewLadderReferenceRung[] {
  const merged = mergeAssumptionsForCrewStep(assumptions, warehouseDefaults);
  const tiers = parseUsageTiers(merged);
  const leadEnabled = isLeadPilotEnabled(merged);
  const limit = Math.max(1, Math.min(maxSteps, CREW_LADDER.length));

  return CREW_LADDER.slice(0, limit).map((crew, stepIndex) => {
    const pilots = totalPilots(crew, leadEnabled);
    return {
      stepIndex,
      crew,
      pilots,
      maxUsage: maxUsageForPilots(pilots, tiers),
    };
  });
}

/** Total pilots (PIC + SIC) at a ladder step. Baseline step 0 = 2. */
export function totalPilotsAtStep(stepIndex: number): number {
  return totalPilots(crewAtStep(stepIndex));
}

/** Lowest step the user may select (warehouse floor + owner-hour requirement). */
export function crewStepFloor(resolved: ResolvedCrewStep): number {
  return Math.max(resolved.minStep, resolved.requiredStep);
}
