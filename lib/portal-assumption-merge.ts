import type { AssumptionMap } from "@/lib/assumptions";
import type { AircraftSnapshotEntry } from "@/lib/portal-aircraft-types";
import {
  mergeAssumptionRowsForInstance,
  type AssumptionRow,
} from "@/lib/proposal-assumption-load";

/** Match snapshot build — prefer per-aircraft rows; legacy only when none exist. */
export function mergeAssumptionRowsForEntry(
  assumptionRows: AssumptionRow[],
  entry: AircraftSnapshotEntry,
  aircraftInstanceId: string | null
): AssumptionMap {
  const resolvedInstanceId =
    aircraftInstanceId && aircraftInstanceId !== "legacy-primary"
      ? aircraftInstanceId
      : entry.id !== "legacy-primary"
        ? entry.id
        : null;

  return mergeAssumptionRowsForInstance(assumptionRows, resolvedInstanceId, {
    alternateInstanceId:
      entry.id !== "legacy-primary" &&
      aircraftInstanceId &&
      aircraftInstanceId !== entry.id
        ? aircraftInstanceId
        : null,
  });
}
