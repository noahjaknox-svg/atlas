import type { AirportReference, Prisma, PrismaClient } from "@prisma/client";

export function isUsAirport(isoCountry: string | null | undefined): boolean {
  return isoCountry === "US";
}

/** Sort airports with US first, then by ident/icao. */
export function compareAirportsUsFirst(
  a: Pick<AirportReference, "isoCountry" | "ident" | "icao">,
  b: Pick<AirportReference, "isoCountry" | "ident" | "icao">
): number {
  const aUs = isUsAirport(a.isoCountry) ? 0 : 1;
  const bUs = isUsAirport(b.isoCountry) ? 0 : 1;
  if (aUs !== bUs) return aUs - bUs;
  const aCode = a.ident || a.icao || "";
  const bCode = b.ident || b.icao || "";
  return aCode.localeCompare(bCode);
}

/** Paginated list: all US airports first (by ident), then all others. */
export async function findAirportReferencesUsFirst(
  db: PrismaClient,
  where: Prisma.AirportReferenceWhereInput,
  { skip, take }: { skip: number; take: number }
): Promise<AirportReference[]> {
  const usWhere: Prisma.AirportReferenceWhereInput = { AND: [where, { isoCountry: "US" }] };
  const nonUsWhere: Prisma.AirportReferenceWhereInput = {
    AND: [where, { isoCountry: { not: "US" } }],
  };

  const usCount = await db.airportReference.count({ where: usWhere });

  if (skip < usCount) {
    const usTake = Math.min(take, usCount - skip);
    const usRows = await db.airportReference.findMany({
      where: usWhere,
      orderBy: { ident: "asc" },
      skip,
      take: usTake,
    });
    if (usRows.length >= take) return usRows;

    const nonUsRows = await db.airportReference.findMany({
      where: nonUsWhere,
      orderBy: { ident: "asc" },
      skip: 0,
      take: take - usRows.length,
    });
    return [...usRows, ...nonUsRows];
  }

  return db.airportReference.findMany({
    where: nonUsWhere,
    orderBy: { ident: "asc" },
    skip: skip - usCount,
    take,
  });
}
