/** Fleet Local Time for empty-leg labels (matches JetInsight Local Time). */
export const EMPTY_LEG_DISPLAY_TIMEZONE = "America/Denver";

export function resolveEmptyLegDisplayTimezone(
  candidate?: string | null
): string {
  if (candidate && candidate !== "UTC") return candidate;
  return EMPTY_LEG_DISPLAY_TIMEZONE;
}
