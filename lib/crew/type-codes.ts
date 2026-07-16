/**
 * Canonical Crew type codes and aliases for /sync wire.
 * One AFM revision per type code for v1.
 */

/** Preferred codes for PrismJet operated fleet. */
export const CANONICAL_CREW_TYPE_CODES = ["B300", "CL35", "LR45"] as const;

/** Retired / duplicate codes → canonical. */
export const CREW_TYPE_CODE_ALIASES: Record<string, string> = {
  LJ45: "LR45",
  // CL30 remains a warehouse commercial type; do not alias to CL35 unless
  // ops confirms Challenger 300s are not operated separately.
};

export function canonicalCrewTypeCode(code: string): string {
  const upper = code.trim().toUpperCase();
  if (!upper) return upper;
  return CREW_TYPE_CODE_ALIASES[upper] ?? upper;
}

export function isCanonicalCrewTypeCode(code: string): boolean {
  return (CANONICAL_CREW_TYPE_CODES as readonly string[]).includes(
    canonicalCrewTypeCode(code)
  );
}
