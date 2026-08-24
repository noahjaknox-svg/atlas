import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { fetchDataHubList } from "@/lib/data-hub-list";
import { parseOptionalInt, parseOptionalString } from "@/lib/data-hub-parse";

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
      (rows) => rows
    );
    return jsonOk(result);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireDepartmentAccess("data_warehouse");
    const body = await request.json();
    const name = parseOptionalString(body.name);
    if (!name) {
      return jsonError("name is required");
    }
    const row = await prisma.usageType.create({
      data: {
        name,
        sortOrder: parseOptionalInt(body.sortOrder) ?? 0,
        active: typeof body.active === "boolean" ? body.active : true,
        charterEnabled: typeof body.charterEnabled === "boolean" ? body.charterEnabled : false,
      },
    });
    return jsonOk(row, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
