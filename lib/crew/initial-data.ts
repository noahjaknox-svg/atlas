import type { CrewInitialDataFile } from "@/lib/crew/types";
import { CREW_OPERATING_DEFAULTS } from "@/lib/crew/types";
import { B300_PERFORMANCE_AXES, buildB300Grid } from "@/lib/crew/seed-grids";

/** Default first-load export (N1213P + B300). Replace cells when Crew sends POH-exact grids. */
export function getAtlasInitialCrewData(): CrewInitialDataFile {
  return {
    aircraftTypes: [
      {
        code: "B300",
        manufacturer: "Beechcraft",
        model: "King Air 350",
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
        axes: B300_PERFORMANCE_AXES,
        values: buildB300Grid("takeoffFieldLength"),
      },
      {
        aircraftTypeCode: "B300",
        metric: "landingDistance",
        unit: "ft",
        axes: B300_PERFORMANCE_AXES,
        values: buildB300Grid("landingDistance"),
      },
    ],
  };
}
