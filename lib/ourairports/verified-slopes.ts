/** Hand-verified Arizona runway slopes (FAA per-end elevations). */
export type VerifiedRunwaySlope = {
  /** ICAO, ident, or local code accepted by airport lookup. */
  codes: readonly string[];
  gradientPct: number;
  highEndRunway: string;
};

export const VERIFIED_RUNWAY_SLOPES: readonly VerifiedRunwaySlope[] = [
  { codes: ["KSEZ"], gradientPct: 1.8, highEndRunway: "21" },
  { codes: ["KOLS"], gradientPct: 1.6, highEndRunway: "22" },
  { codes: ["KCFT"], gradientPct: 1.5, highEndRunway: "25" },
  { codes: ["KTYL"], gradientPct: 1.5, highEndRunway: "3" },
  { codes: ["KP13", "P13"], gradientPct: 1.2, highEndRunway: "9" },
  { codes: ["KPGA"], gradientPct: 1.2, highEndRunway: "33" },
  { codes: ["K1G4", "1G4"], gradientPct: 1.1, highEndRunway: "35" },
  { codes: ["KCMR"], gradientPct: 1.0, highEndRunway: "36" },
  { codes: ["KFHU"], gradientPct: 1.0, highEndRunway: "8" },
  { codes: ["KP52", "P52"], gradientPct: 1.0, highEndRunway: "32" },
  { codes: ["KPRC"], gradientPct: 0.9, highEndRunway: "3" },
  { codes: ["KGCN"], gradientPct: 0.8, highEndRunway: "21" },
  { codes: ["KINW"], gradientPct: 0.8, highEndRunway: "4" },
  { codes: ["KDUG"], gradientPct: 0.6, highEndRunway: "17" },
  { codes: ["KJTC", "KD68"], gradientPct: 0.5, highEndRunway: "3" },
  { codes: ["KHII"], gradientPct: 0.4, highEndRunway: "32" },
  { codes: ["KP14", "P14"], gradientPct: 0.4, highEndRunway: "21" },
  { codes: ["KPAN"], gradientPct: 0.3, highEndRunway: "24" },
  { codes: ["KSAD"], gradientPct: 0.3, highEndRunway: "30" },
  { codes: ["KAVQ"], gradientPct: 0.3, highEndRunway: "30" },
  { codes: ["KFLG"], gradientPct: 0.2, highEndRunway: "3" },
  { codes: ["KIGM"], gradientPct: 0.2, highEndRunway: "3" },
];

/** Airports where computed OurAirports slopes are known bad — keep verified null (level). */
export const CLEARED_VERIFIED_AIRPORTS = ["KSMO", "KSDL"] as const;
