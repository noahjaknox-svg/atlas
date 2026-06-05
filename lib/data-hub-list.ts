import {
  buildPrismaWhere,
  listResponse,
  parseListQuery,
  type DataHubEntity,
} from "@/lib/data-hub-query";

export async function fetchDataHubList<T>(
  request: Request,
  entity: DataHubEntity,
  findMany: (where: Record<string, unknown>) => Promise<T[]>,
  count: (where?: Record<string, unknown>) => Promise<number>,
  mapRows: (rows: T[]) => unknown[]
) {
  const filters = parseListQuery(request.url);
  const where = buildPrismaWhere(entity, filters);
  const [total, rows] = await Promise.all([count(), findMany(where)]);
  return listResponse(mapRows(rows), total);
}
