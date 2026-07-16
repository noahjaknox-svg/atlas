import { prisma } from "@/lib/db";
import { dec } from "@/lib/data-hub-serialize";
import { fetchDataHubList } from "@/lib/data-hub-list";
import { parseDataHubFilters, buildDataHubQuery } from "@/lib/data-hub-filters";
import { serializeAircraftType } from "@/lib/warehouse-aircraft-fields";

export type DataHubListPayload = {
  rows: Record<string, unknown>[];
  total: number;
  filtered: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

const CRUD_TABS = new Set(["aircraft", "fbos"]);

function buildPrefetchRequest(searchParams: URLSearchParams): Request {
  const url = new URL("http://local/prefetch");
  searchParams.forEach((value, key) => {
    if (key !== "tab") url.searchParams.set(key, value);
  });
  return new Request(url);
}

export function isPrefetchableDataHubTab(tab: string): boolean {
  return CRUD_TABS.has(tab);
}

export async function prefetchDataHubTab(
  tab: string,
  searchParams: URLSearchParams
): Promise<DataHubListPayload | null> {
  if (!CRUD_TABS.has(tab)) return null;

  const request = buildPrefetchRequest(searchParams);
  const asPayload = <T>(promise: Promise<T>) => promise as Promise<DataHubListPayload>;

  switch (tab) {
    case "aircraft":
      return asPayload(
        fetchDataHubList(
          request,
          "aircraft",
          (where, { skip, take }) =>
            prisma.aircraftType.findMany({
              where,
              skip,
              take,
              orderBy: { displayName: "asc" },
            }),
          () => prisma.aircraftType.count(),
          (rows) => rows.map(serializeAircraftType)
        )
      );

    case "fbos":
      return asPayload(
        fetchDataHubList(
          request,
          "fbos",
          (where, { skip, take }) =>
            prisma.fbo.findMany({
              where,
              skip,
              take,
              orderBy: [{ airportIcao: "asc" }, { fboName: "asc" }],
              include: { _count: { select: { hangarOverrides: true } } },
            }),
          () => prisma.fbo.count(),
          (rows) =>
            rows.map((r) => ({
              id: r.id,
              fboName: r.fboName,
              airportIcao: r.airportIcao,
              baseFuelRate: dec(r.baseFuelRate),
              hangarCostPerSqft: dec(r.hangarCostPerSqft),
              overrides: r._count.hangarOverrides,
            }))
        )
      );

    default:
      return null;
  }
}

export function dataHubSearchParamsFromRecord(
  params: Record<string, string | undefined>
): URLSearchParams {
  const filters = parseDataHubFilters({
    get: (key: string) => params[key] ?? null,
  });
  const qs = buildDataHubQuery(filters);
  if (params.tab) qs.set("tab", params.tab);
  return qs;
}
