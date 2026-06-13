import type { PrismaClient } from "@prisma/client";
import {
  findRunwayByHighEnd,
} from "@/lib/ourairports/gradient";
import { findAirportReferenceByCode } from "@/lib/ourairports/lookup";
import {
  CLEARED_VERIFIED_AIRPORTS,
  VERIFIED_RUNWAY_SLOPES,
} from "@/lib/ourairports/verified-slopes";

export async function backfillRunwayGradientEstimates(db: PrismaClient): Promise<number> {
  const result = await db.$executeRaw`
    UPDATE airport_runway_reference
    SET gradient_pct_estimated = ROUND(
      ((ABS(le_elevation_ft - he_elevation_ft)::numeric / length_ft) * 100)::numeric,
      2
    )::double precision
    WHERE length_ft > 0
      AND le_elevation_ft IS NOT NULL
      AND he_elevation_ft IS NOT NULL
  `;
  return result;
}

export async function seedVerifiedRunwaySlopes(db: PrismaClient): Promise<{
  verified: number;
  cleared: number;
  estimated: number;
  missing: string[];
}> {
  const estimated = await backfillRunwayGradientEstimates(db);
  const missing: string[] = [];
  let verified = 0;

  for (const entry of VERIFIED_RUNWAY_SLOPES) {
    let airport = null;
    for (const code of entry.codes) {
      airport = await findAirportReferenceByCode(db, code);
      if (airport) break;
      airport = await db.airportReference.findFirst({
        where: { gpsCode: code.toUpperCase() },
        include: {
          runways: { where: { closed: false }, orderBy: { lengthFt: "desc" } },
          frequencies: true,
        },
      });
      if (airport) break;
    }
    if (!airport) {
      missing.push(entry.codes[0]!);
      continue;
    }

    const allRunways = await db.airportRunwayReference.findMany({
      where: { airportId: airport.id, closed: false },
    });
    const runway = findRunwayByHighEnd(allRunways, entry.highEndRunway);
    if (!runway) {
      missing.push(`${entry.codes[0]}:${entry.highEndRunway}`);
      continue;
    }

    await db.airportRunwayReference.update({
      where: { id: runway.id },
      data: {
        gradientPctVerified: entry.gradientPct,
        gradientHighEndVerified: entry.highEndRunway,
      },
    });
    verified += 1;
  }

  let cleared = 0;
  for (const code of CLEARED_VERIFIED_AIRPORTS) {
    const airport = await findAirportReferenceByCode(db, code);
    if (!airport) continue;
    const result = await db.airportRunwayReference.updateMany({
      where: { airportId: airport.id },
      data: {
        gradientPctVerified: null,
        gradientHighEndVerified: null,
      },
    });
    cleared += result.count;
  }

  return { verified, cleared, estimated, missing };
}
