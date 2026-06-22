/**
 * V1.1 required-field checklist (spec §9.3) for pipeline badges and workspace completeness.
 */

export type AssumptionLike = { assumptionName: string; value: string };

export const REQUIRED_FIELD_CHECKS: {
  key: string;
  label: string;
  /** If true, only required when charter operating model is enabled */
  charterOnly?: boolean;
}[] = [
  { key: "aircraft_value", label: "Aircraft value" },
  { key: "owner_annual_hours", label: "Owner annual hours" },
  { key: "home_airport_icao", label: "Home airport (ICAO)" },
  { key: "pic_salary", label: "PIC salary" },
  { key: "hangar_annual", label: "Hangar cost" },
  { key: "insurance_annual", label: "Insurance estimate" },
  { key: "management_fee", label: "Management fee" },
  { key: "home_fuel_price", label: "Fuel price (home)" },
  { key: "charter_rate", label: "Charter rate", charterOnly: true },
];

export function assumptionsToMap(
  assumptions: AssumptionLike[]
): Record<string, string> {
  return Object.fromEntries(assumptions.map((a) => [a.assumptionName, a.value ?? ""]));
}

export function isCharterEnabled(map: Record<string, string>): boolean {
  const model = (map.operating_model ?? "").toLowerCase();
  if (model.includes("charter") || model.includes("135") || model.includes("hybrid")) {
    return true;
  }
  if (model.includes("91 management only") || model === "part_91_only") {
    return false;
  }
  const block = parseFloat(map.charter_block_hours ?? "0");
  return block > 0;
}

export function hasCrewConfigured(map: Record<string, string>): boolean {
  return !!(
    map.pic_salary?.trim() ||
    map.sic_salary?.trim() ||
    map.crew_total?.trim()
  );
}

export function getMissingRequiredFields(assumptions: AssumptionLike[]): string[] {
  const map = assumptionsToMap(assumptions);
  const charter = isCharterEnabled(map);
  const missing: string[] = [];

  for (const check of REQUIRED_FIELD_CHECKS) {
    if (check.charterOnly && !charter) continue;
    const v = map[check.key];
    if (check.key === "hangar_annual") {
      if (v?.trim()) continue;
      if (map.square_footage?.trim() && map.hangar_cost_per_sqft?.trim()) continue;
      if (map.hangar_monthly?.trim()) continue;
      missing.push(check.label);
      continue;
    }
    if (check.key === "insurance_annual") {
      if (
        !v?.trim() &&
        !map.insurance_premium_percent?.trim() &&
        !map.fixed_insurance_annual?.trim()
      ) {
        missing.push(check.label);
      }
      continue;
    }
    if (!v?.trim()) missing.push(check.label);
  }

  if (!hasCrewConfigured(map)) {
    missing.push("Crew configured");
  }

  return missing;
}

export function getMissingInfoCount(assumptions: AssumptionLike[]): number {
  return getMissingRequiredFields(assumptions).length;
}
