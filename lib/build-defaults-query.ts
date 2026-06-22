import type { AssumptionMap } from "@/lib/assumptions";

/** Query params for the defaults API — omits stale client-side warehouse ids. */
export function buildDefaultsQueryParams(assumptions: AssumptionMap): URLSearchParams {
  const params = new URLSearchParams();
  const home =
    assumptions.home_airport_icao?.trim() || assumptions.proposed_home_base?.trim();
  if (home) params.set("homeIcao", home);
  if (assumptions.fbo_name?.trim()) params.set("fboName", assumptions.fbo_name.trim());
  if (assumptions.usage_type?.trim()) params.set("usageType", assumptions.usage_type.trim());
  return params;
}
