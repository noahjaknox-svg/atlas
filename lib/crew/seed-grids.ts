/**
 * Build B300-style performance grids for seed data.
 * Structure: values[pressureAltitudeIdx][weightIdx][oatIdx]
 * Replace with POH-exact numbers when atlas_initial_data.json is available from Crew.
 */
import type { CrewGridValues, CrewPerformanceAxes } from "@/lib/crew/types";

export const B300_PERFORMANCE_AXES: CrewPerformanceAxes = {
  pressureAltitudeFt: [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000],
  weightLb: [11000, 11400, 11800, 12200, 12600, 13000, 13400, 13800, 14200, 15000],
  oatC: [-10, 0, 10, 20, 30, 35, 40, 45, 50],
};

function beyondEnvelope(
  pa: number,
  weight: number,
  oat: number,
  metric: "takeoffFieldLength" | "landingDistance"
): boolean {
  if (weight > 15000) return true;
  if (pa >= 10000 && weight > 13000) return true;
  if (pa >= 8000 && weight > 14200 && oat >= 40) return true;
  if (pa >= 6000 && weight > 14600 && oat >= 45) return true;
  if (metric === "landingDistance" && pa >= 9000 && weight > 13800) return true;
  return false;
}

function cellValue(
  pa: number,
  weight: number,
  oat: number,
  metric: "takeoffFieldLength" | "landingDistance"
): number {
  const base = metric === "takeoffFieldLength" ? 2200 : 1800;
  const paFactor = pa * 0.12;
  const weightFactor = (weight - 11000) * 0.35;
  const oatFactor = Math.max(0, oat + 10) * 18;
  return Math.round(base + paFactor + weightFactor + oatFactor);
}

export function buildB300Grid(
  metric: "takeoffFieldLength" | "landingDistance"
): CrewGridValues {
  const { pressureAltitudeFt, weightLb, oatC } = B300_PERFORMANCE_AXES;
  return pressureAltitudeFt.map((pa) =>
    weightLb.map((w) =>
      oatC.map((oat) =>
        beyondEnvelope(pa, w, oat, metric) ? null : cellValue(pa, w, oat, metric)
      )
    )
  );
}
