import type { PrismaClient } from "@prisma/client";
import {
  CREW_SYNC_POLICY,
  type CrewSyncPolicy,
} from "@/lib/crew/performance-model";

const POLICY_ID = "default";

export function parseCrewSyncPolicy(raw: unknown): CrewSyncPolicy | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const keys: (keyof CrewSyncPolicy)[] = [
    "minRunwayFt",
    "highElevationFt",
    "highElevationMinRunwayFt",
    "shortRunwayFt",
    "midElevationFt",
    "longRunwayFt",
    "freeGreenElevationFt",
    "tightMarginFt",
    "alternateMinCeilingFt",
    "alternateMinVisibilitySm",
    "forecastLeadMinutes",
  ];
  const out: Partial<CrewSyncPolicy> = {};
  for (const key of keys) {
    const v = o[key];
    if (typeof v !== "number" || !Number.isFinite(v) || v === 0) {
      return null;
    }
    out[key] = v;
  }
  return out as CrewSyncPolicy;
}

export async function loadCrewOrgPolicy(db: PrismaClient): Promise<CrewSyncPolicy> {
  try {
    const row = await db.crewOrgPolicy.findUnique({ where: { id: POLICY_ID } });
    const parsed = parseCrewSyncPolicy(row?.thresholds);
    return parsed ?? CREW_SYNC_POLICY;
  } catch {
    return CREW_SYNC_POLICY;
  }
}

export async function upsertCrewOrgPolicy(
  db: PrismaClient,
  thresholds: CrewSyncPolicy
): Promise<CrewSyncPolicy> {
  const parsed = parseCrewSyncPolicy(thresholds);
  if (!parsed) {
    throw new Error("Invalid policy thresholds (no zeros; all fields required)");
  }

  const row = await db.crewOrgPolicy.upsert({
    where: { id: POLICY_ID },
    create: { id: POLICY_ID, thresholds: parsed },
    update: { thresholds: parsed },
  });

  return parseCrewSyncPolicy(row.thresholds) ?? parsed;
}
