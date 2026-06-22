import type { AssumptionMap } from "@/lib/assumptions";

/** True when an aircraft is linked to a model but core warehouse fields were never copied. */
export function needsWarehouseSeed(assumptions: AssumptionMap): boolean {
  const hasAircraftContext =
    Boolean(assumptions.aircraft_master_id?.trim()) ||
    (Boolean(assumptions.aircraft_manufacturer?.trim()) &&
      Boolean(assumptions.aircraft_model?.trim()));
  if (!hasAircraftContext) return false;

  const corePopulated = [
    assumptions.square_footage,
    assumptions.engine_program_rate,
    assumptions.crew_total,
    assumptions.hangar_cost_per_sqft,
  ].filter((v) => Boolean(v?.trim())).length;

  return corePopulated < 2;
}
