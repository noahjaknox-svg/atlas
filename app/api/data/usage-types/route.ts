import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { fetchDataHubList } from "@/lib/data-hub-list";
import { parseUsageTypeConfig } from "@/lib/usage-type-config";
import { toUsageTypeWire, usageTypeBodySchema } from "@/lib/usage-type-api";

export async function GET(request: Request) {
  try {
    await requireDepartmentAccess("data_warehouse");
    const result = await fetchDataHubList(
      request,
      "usage-types",
      (where, { skip, take }) =>
        prisma.usageType.findMany({
          where,
          skip,
          take,
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        }),
      () => prisma.usageType.count(),
      (rows) => rows.map(toUsageTypeWire)
    );
    return jsonOk(result);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireDepartmentAccess("data_warehouse");
    const parsed = usageTypeBodySchema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid usage type");
    const body = parsed.data;
    if (!body.name) {
      return jsonError("name is required");
    }
    const row = await prisma.usageType.create({
      data: {
        name: body.name,
        sortOrder: body.sortOrder ?? 0,
        active: body.active ?? true,
        charterEnabled: body.charterEnabled ?? false,
        config: parseUsageTypeConfig(body.config),
      },
    });
    return jsonOk(toUsageTypeWire(row), 201);
  } catch (e) {
    return handleApiError(e);
  }
}
