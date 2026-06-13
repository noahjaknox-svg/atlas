import {
  buildPrismaWhere,
  listResponse,
  parseListQuery,
  type DataHubEntity,
} from "@/lib/data-hub-query";

export const DATA_HUB_PAGE_SIZE = 100;

export type DataHubPagination = { skip: number; take: number };

export function parsePagination(url: URL | string) {
  const u = typeof url === "string" ? new URL(url, "http://local") : url;
  const page = Math.max(1, parseInt(u.searchParams.get("page") ?? "1", 10) || 1);
  const limitRaw = parseInt(u.searchParams.get("limit") ?? String(DATA_HUB_PAGE_SIZE), 10);
  const limit = Math.min(500, Math.max(1, limitRaw || DATA_HUB_PAGE_SIZE));
  return { page, limit, skip: (page - 1) * limit };
}

export async function fetchDataHubList<T>(
  request: Request,
  entity: DataHubEntity,
  findMany: (where: Record<string, unknown>, pagination: DataHubPagination) => Promise<T[]>,
  count: (where?: Record<string, unknown>) => Promise<number>,
  mapRows: (rows: T[]) => unknown[]
) {
  const filters = parseListQuery(request.url);
  const where = buildPrismaWhere(entity, filters);
  const { page, limit, skip } = parsePagination(request.url);
  const [total, filtered, rows] = await Promise.all([
    count(),
    count(where),
    findMany(where, { skip, take: limit }),
  ]);
  return listResponse(mapRows(rows), total, filtered, page, limit);
}
