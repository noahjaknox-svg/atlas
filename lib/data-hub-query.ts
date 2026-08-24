import type { Prisma } from "@prisma/client";
import type { DataHubFilters } from "@/lib/data-hub-filters";

export type ListQueryFilters = DataHubFilters;

export type DataHubEntity = "aircraft" | "fbos" | "airports" | "usage-types";

export function parseListQuery(url: URL | string): ListQueryFilters {
  const u = typeof url === "string" ? new URL(url, "http://local") : url;
  const filters: ListQueryFilters = {};
  const keys = ["q", "airportIcao", "category"] as const;
  for (const key of keys) {
    const v = u.searchParams.get(key)?.trim();
    if (v) filters[key] = v;
  }
  return filters;
}

export function buildPrismaWhere(
  entity: DataHubEntity,
  filters: ListQueryFilters
): Record<string, unknown> {
  const q = filters.q?.trim();

  switch (entity) {
    case "aircraft": {
      const and: Prisma.AircraftTypeWhereInput[] = [];
      if (filters.category) {
        and.push({ aircraftCategory: filters.category as Prisma.EnumAircraftCategoryNullableFilter });
      }
      if (q) {
        and.push({
          OR: [
            { displayName: { contains: q, mode: "insensitive" } },
            { manufacturer: { contains: q, mode: "insensitive" } },
            { model: { contains: q, mode: "insensitive" } },
            { modelCode: { contains: q, mode: "insensitive" } },
          ],
        });
      }
      return and.length ? { AND: and } : {};
    }

    case "fbos": {
      const and: Prisma.FboWhereInput[] = [];
      if (filters.airportIcao) {
        and.push({ airportIcao: { equals: filters.airportIcao, mode: "insensitive" } });
      }
      if (q) {
        and.push({
          OR: [
            { fboName: { contains: q, mode: "insensitive" } },
            { airportIcao: { contains: q, mode: "insensitive" } },
          ],
        });
      }
      return and.length ? { AND: and } : {};
    }

    case "airports": {
      const and: Prisma.AirportReferenceWhereInput[] = [];
      if (q) {
        and.push({
          OR: [
            { icao: { contains: q, mode: "insensitive" } },
            { ident: { contains: q, mode: "insensitive" } },
            { iata: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { municipality: { contains: q, mode: "insensitive" } },
          ],
        });
      }
      return and.length ? { AND: and } : {};
    }

    case "usage-types": {
      const and: Prisma.UsageTypeWhereInput[] = [];
      if (q) {
        and.push({ name: { contains: q, mode: "insensitive" } });
      }
      return and.length ? { AND: and } : {};
    }

    default:
      return {};
  }
}

export function listResponse<T>(
  rows: T[],
  total: number,
  filtered: number,
  page = 1,
  pageSize = rows.length
) {
  return {
    rows,
    total,
    filtered,
    page,
    pageSize,
    hasMore: page * pageSize < filtered,
  };
}

export function hasListFilters(filters: ListQueryFilters): boolean {
  return Object.values(filters).some((v) => v?.trim());
}
