import type { Prisma } from "@prisma/client";
import type { DataHubFilters } from "@/lib/data-hub-filters";

export type ListQueryFilters = DataHubFilters;

export type DataHubEntity =
  | "airports"
  | "fbos"
  | "aircraft-master"
  | "operating-defaults"
  | "crew-rates"
  | "training-costs"
  | "program-costs"
  | "insurance-assumptions"
  | "hangar-costs"
  | "airport-fees"
  | "state-cost-factors"
  | "charter-rates"
  | "scenario-templates";

export function parseListQuery(url: URL | string): ListQueryFilters {
  const u = typeof url === "string" ? new URL(url, "http://local") : url;
  const filters: ListQueryFilters = {};
  const keys = [
    "q",
    "aircraftId",
    "airportId",
    "state",
    "role",
    "programType",
    "costKey",
    "category",
    "pricingMethod",
  ] as const;
  for (const key of keys) {
    const v = u.searchParams.get(key)?.trim();
    if (v) filters[key] = v;
  }
  return filters;
}

function qContains(q: string): string {
  return q.trim();
}

function aircraftMasterTextOr(q: string): Prisma.AircraftMasterWhereInput {
  const term = qContains(q);
  return {
    OR: [
      { manufacturer: { contains: term, mode: "insensitive" } },
      { model: { contains: term, mode: "insensitive" } },
      { variant: { contains: term, mode: "insensitive" } },
    ],
  };
}

function airportTextOr(q: string): Prisma.AirportWhereInput {
  const term = qContains(q);
  return {
    OR: [
      { icao: { contains: term, mode: "insensitive" } },
      { airportName: { contains: term, mode: "insensitive" } },
      { city: { contains: term, mode: "insensitive" } },
    ],
  };
}

export function buildPrismaWhere(
  entity: DataHubEntity,
  filters: ListQueryFilters
): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  const q = filters.q?.trim();

  switch (entity) {
    case "airports": {
      const and: Prisma.AirportWhereInput[] = [];
      if (filters.state) and.push({ state: { equals: filters.state, mode: "insensitive" } });
      if (q) and.push(airportTextOr(q));
      return and.length ? { AND: and } : {};
    }

    case "fbos": {
      const and: Prisma.FboLocationWhereInput[] = [];
      if (filters.airportId) and.push({ airportId: filters.airportId });
      if (q) {
        and.push({
          OR: [
            { fboName: { contains: q, mode: "insensitive" } },
            { airport: airportTextOr(q) },
          ],
        });
      }
      return and.length ? { AND: and } : {};
    }

    case "aircraft-master": {
      const and: Prisma.AircraftMasterWhereInput[] = [];
      if (filters.category) {
        and.push({ aircraftCategory: filters.category as Prisma.EnumAircraftCategoryFilter });
      }
      if (q) and.push(aircraftMasterTextOr(q));
      return and.length ? { AND: and } : {};
    }

    case "operating-defaults": {
      const and: Prisma.AircraftOperatingDefaultWhereInput[] = [];
      if (filters.aircraftId) and.push({ aircraftMasterId: filters.aircraftId });
      if (filters.costKey) and.push({ costKey: filters.costKey });
      if (q) {
        and.push({
          OR: [
            { costKey: { contains: q, mode: "insensitive" } },
            { source: { contains: q, mode: "insensitive" } },
            { aircraftMaster: aircraftMasterTextOr(q) },
          ],
        });
      }
      return and.length ? { AND: and } : {};
    }

    case "crew-rates": {
      const and: Prisma.CrewRateWhereInput[] = [];
      if (filters.aircraftId) and.push({ aircraftMasterId: filters.aircraftId });
      if (filters.role) and.push({ role: filters.role as Prisma.EnumCrewRoleFilter });
      if (q) {
        and.push({
          OR: [
            { role: { equals: q as Prisma.EnumCrewRoleFilter["equals"] } },
            { source: { contains: q, mode: "insensitive" } },
            { aircraftMaster: aircraftMasterTextOr(q) },
          ],
        });
      }
      return and.length ? { AND: and } : {};
    }

    case "training-costs": {
      const and: Prisma.TrainingCostWhereInput[] = [];
      if (filters.aircraftId) and.push({ aircraftMasterId: filters.aircraftId });
      if (filters.role) and.push({ role: filters.role as Prisma.EnumCrewRoleFilter });
      if (q) {
        and.push({
          OR: [
            { role: { equals: q as Prisma.EnumCrewRoleFilter["equals"] } },
            { provider: { contains: q, mode: "insensitive" } },
            { aircraftMaster: aircraftMasterTextOr(q) },
          ],
        });
      }
      return and.length ? { AND: and } : {};
    }

    case "program-costs": {
      const and: Prisma.ProgramCostWhereInput[] = [];
      if (filters.aircraftId) and.push({ aircraftMasterId: filters.aircraftId });
      if (filters.programType) {
        and.push({ programType: filters.programType as Prisma.EnumProgramTypeFilter });
      }
      if (q) {
        and.push({
          OR: [
            { programType: { equals: q as Prisma.EnumProgramTypeFilter["equals"] } },
            { provider: { contains: q, mode: "insensitive" } },
            { aircraftMaster: aircraftMasterTextOr(q) },
          ],
        });
      }
      return and.length ? { AND: and } : {};
    }

    case "insurance-assumptions": {
      const and: Prisma.InsuranceAssumptionWhereInput[] = [];
      if (filters.aircraftId) and.push({ aircraftMasterId: filters.aircraftId });
      if (filters.state) and.push({ state: { equals: filters.state, mode: "insensitive" } });
      if (q) {
        and.push({
          OR: [
            { state: { contains: q, mode: "insensitive" } },
            { source: { contains: q, mode: "insensitive" } },
            { aircraftMaster: aircraftMasterTextOr(q) },
          ],
        });
      }
      return and.length ? { AND: and } : {};
    }

    case "hangar-costs": {
      const and: Prisma.HangarCostWhereInput[] = [];
      if (filters.aircraftId) and.push({ aircraftMasterId: filters.aircraftId });
      if (filters.airportId) and.push({ airportId: filters.airportId });
      if (filters.category) {
        and.push({ aircraftCategory: filters.category as Prisma.EnumAircraftCategoryFilter });
      }
      if (filters.pricingMethod) {
        and.push({
          pricingMethod: filters.pricingMethod as Prisma.EnumHangarPricingMethodFilter,
        });
      }
      if (q) {
        and.push({
          OR: [
            { provider: { contains: q, mode: "insensitive" } },
            { aircraftMaster: aircraftMasterTextOr(q) },
            { airport: airportTextOr(q) },
            { fboLocation: { fboName: { contains: q, mode: "insensitive" } } },
          ],
        });
      }
      return and.length ? { AND: and } : {};
    }

    case "airport-fees": {
      const and: Prisma.AirportFeeScheduleWhereInput[] = [];
      if (filters.airportId) and.push({ airportId: filters.airportId });
      if (q) {
        and.push({
          OR: [{ source: { contains: q, mode: "insensitive" } }, { airport: airportTextOr(q) }],
        });
      }
      return and.length ? { AND: and } : {};
    }

    case "state-cost-factors": {
      const and: Prisma.StateCostFactorWhereInput[] = [];
      if (filters.state) and.push({ state: { equals: filters.state, mode: "insensitive" } });
      if (q) {
        and.push({
          OR: [
            { state: { contains: q, mode: "insensitive" } },
            { registrationNotes: { contains: q, mode: "insensitive" } },
            { taxNotes: { contains: q, mode: "insensitive" } },
          ],
        });
      }
      return and.length ? { AND: and } : {};
    }

    case "charter-rates": {
      const and: Prisma.CharterMarketRateWhereInput[] = [];
      if (filters.aircraftId) and.push({ aircraftMasterId: filters.aircraftId });
      if (filters.airportId) and.push({ airportId: filters.airportId });
      if (q) {
        and.push({
          OR: [
            { source: { contains: q, mode: "insensitive" } },
            { aircraftMaster: aircraftMasterTextOr(q) },
            { airport: airportTextOr(q) },
          ],
        });
      }
      return and.length ? { AND: and } : {};
    }

    case "scenario-templates": {
      const and: Prisma.ScenarioTemplateWhereInput[] = [];
      if (filters.aircraftId) and.push({ aircraftMasterId: filters.aircraftId });
      if (q) {
        and.push({
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { aircraftMaster: aircraftMasterTextOr(q) },
          ],
        });
      }
      return and.length ? { AND: and } : {};
    }

    default:
      return where;
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
