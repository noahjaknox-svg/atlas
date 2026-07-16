import { readFileSync } from "fs";
import { join } from "path";
import type { CrewInitialDataFile } from "@/lib/crew/types";
import { normalizeCrewInitialData } from "@/lib/crew/normalize-initial-data";
import { CREW_OPERATING_DEFAULTS } from "@/lib/crew/types";
import { B300_PERFORMANCE_AXES, buildB300Grid } from "@/lib/crew/seed-grids";
import { B300_PERFORMANCE_MODEL } from "@/lib/crew/performance-model";

/**
 * Prefer real POH seed file when present; fall back to synthetic grids for
 * environments without the JSON (tests / empty checkout).
 */
export function getAtlasInitialCrewData(): CrewInitialDataFile {
  try {
    const path = join(process.cwd(), "data", "seeds", "atlas_initial_data.json");
    const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
    return normalizeCrewInitialData(raw);
  } catch {
    return getSyntheticBundledCrewData();
  }
}

/** Formula stand-in — only used when atlas_initial_data.json is unavailable. */
export function getSyntheticBundledCrewData(): CrewInitialDataFile {
  return {
    aircraftTypes: [
      {
        code: "B300",
        manufacturer: "Beechcraft",
        model: "King Air 350",
        performanceModel: B300_PERFORMANCE_MODEL,
      },
    ],
    fleet: [
      {
        tailNumber: "N1213P",
        aircraftTypeCode: "B300",
        status: "active",
        homeBase: "KPHX",
        serialNumber: "FL-843",
        operating: {
          ...CREW_OPERATING_DEFAULTS,
          basicEmptyWeightLb: 10287,
        },
      },
    ],
    performance: [
      {
        aircraftTypeCode: "B300",
        metric: "takeoffFieldLength",
        unit: "ft",
        source: "Synthetic formula stand-in (atlas_initial_data.json unavailable)",
        axes: B300_PERFORMANCE_AXES,
        values: buildB300Grid("takeoffFieldLength"),
      },
      {
        aircraftTypeCode: "B300",
        metric: "landingDistance",
        unit: "ft",
        source: "Synthetic formula stand-in (atlas_initial_data.json unavailable)",
        axes: B300_PERFORMANCE_AXES,
        values: buildB300Grid("landingDistance"),
      },
    ],
  };
}
