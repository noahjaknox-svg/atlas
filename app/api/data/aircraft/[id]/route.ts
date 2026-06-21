import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import {
  applyPublishDefaults,
  buildWarehouseAircraftData,
  getMissingPublishFields,
  parseSaveAs,
  serializeWarehouseAircraft,
  WAREHOUSE_AIRCRAFT_FIELDS,
} from "@/lib/warehouse-aircraft-fields";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const row = await prisma.warehouseAircraft.findUnique({ where: { id } });
    if (!row) return jsonError("Not found", 404);
    return jsonOk(serializeWarehouseAircraft(row));
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const saveAs = parseSaveAs(body);

    if (saveAs === "publish") {
      const existing = await prisma.warehouseAircraft.findUnique({ where: { id } });
      if (!existing) return jsonError("Not found", 404);
      const merged: Record<string, string | null | undefined> = {};
      for (const f of WAREHOUSE_AIRCRAFT_FIELDS) {
        const fromBody = body[f.key];
        if (fromBody !== undefined) {
          merged[f.key] =
            fromBody === null || fromBody === "" ? null : String(fromBody);
        } else {
          const fromDb = existing[f.key as keyof typeof existing];
          merged[f.key] =
            fromDb == null ? null : typeof fromDb === "boolean" ? String(fromDb) : String(fromDb);
        }
      }
      const missing = getMissingPublishFields(merged);
      if (missing.length > 0) {
        return jsonError(`Missing required fields: ${missing.map((f) => f.label).join(", ")}`);
      }
    }

    if (body.displayName !== undefined && !String(body.displayName).trim()) {
      return jsonError("Display Name is required");
    }

    let data = buildWarehouseAircraftData(body, { partial: true });
    data.status = saveAs === "publish" ? "published" : "draft";
    if (saveAs === "publish") data = applyPublishDefaults({ ...data, status: "published" });

    const row = await prisma.warehouseAircraft.update({ where: { id }, data });
    return jsonOk(serializeWarehouseAircraft(row));
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.warehouseAircraft.delete({ where: { id } });
    return jsonOk({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
