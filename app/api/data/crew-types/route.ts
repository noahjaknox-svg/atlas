import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await requireDepartmentAccess("data_warehouse");
    const rows = await prisma.crewAircraftType.findMany({
      orderBy: { code: "asc" },
    });
    return jsonOk({
      rows: rows.map((t) => ({
        id: t.id,
        code: t.code,
        manufacturer: t.manufacturer,
        model: t.model,
        updatedAt: t.updatedAt.toISOString(),
      })),
      total: rows.length,
      filtered: rows.length,
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireDepartmentAccess("data_warehouse");
    const body = await request.json();
    const code = String(body.code ?? "").trim().toUpperCase();
    const manufacturer = String(body.manufacturer ?? "").trim();
    const model = String(body.model ?? "").trim();
    if (!code || !manufacturer || !model) {
      return handleApiError(new Error("code, manufacturer, and model are required"));
    }
    const row = await prisma.crewAircraftType.create({
      data: { code, manufacturer, model },
    });
    return jsonOk({
      id: row.id,
      code: row.code,
      manufacturer: row.manufacturer,
      model: row.model,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
