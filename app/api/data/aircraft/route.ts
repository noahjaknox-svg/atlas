import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { fetchDataHubList } from "@/lib/data-hub-list";
import {
  applyPublishDefaults,
  buildWarehouseAircraftData,
  getMissingPublishFields,
  parseSaveAs,
  serializeWarehouseAircraft,
} from "@/lib/warehouse-aircraft-fields";
import { defaultWarehouseFieldVisibility } from "@/lib/warehouse-aircraft-proforma-visibility";

export async function GET(request: Request) {
  try {
    await requireDepartmentAccess("data_warehouse");
    const result = await fetchDataHubList(
      request,
      "aircraft",
      (where, { skip, take }) =>
        prisma.warehouseAircraft.findMany({
          where,
          skip,
          take,
          orderBy: { displayName: "asc" },
        }),
      () => prisma.warehouseAircraft.count(),
      (rows) => rows.map(serializeWarehouseAircraft)
    );
    return jsonOk(result);
  } catch (e) {
    return handleApiError(e);
  }
}

async function uniqueDisplayName(base: string): Promise<string> {
  let candidate = base;
  let n = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await prisma.warehouseAircraft.findUnique({ where: { displayName: candidate } })) {
    candidate = `${base} (${n})`;
    n += 1;
  }
  return candidate;
}

function bodyAsValues(body: Record<string, unknown>): Record<string, string | null | undefined> {
  const out: Record<string, string | null | undefined> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v == null) out[k] = null;
    else out[k] = String(v);
  }
  return out;
}

export async function POST(request: Request) {
  try {
    await requireDepartmentAccess("data_warehouse");
    const body = await request.json();

    if (body.copyFromId) {
      const source = await prisma.warehouseAircraft.findUnique({
        where: { id: String(body.copyFromId) },
      });
      if (!source) return jsonError("Source aircraft not found", 404);
      const { id, createdAt, updatedAt, displayName, status, ...rest } = source;
      void id;
      void createdAt;
      void updatedAt;
      void status;
      const row = await prisma.warehouseAircraft.create({
        data: {
          ...rest,
          status: "draft",
          displayName: await uniqueDisplayName(`${displayName} (Copy)`),
          proformaFieldVisibility:
            source.proformaFieldVisibility ?? defaultWarehouseFieldVisibility(),
        },
      });
      return jsonOk(serializeWarehouseAircraft(row), 201);
    }

    const displayName = String(body.displayName ?? "").trim();
    if (!displayName) return jsonError("Display Name is required");

    const saveAs = parseSaveAs(body);
    if (saveAs === "publish") {
      const missing = getMissingPublishFields(bodyAsValues(body));
      if (missing.length > 0) {
        return jsonError(`Missing required fields: ${missing.map((f) => f.label).join(", ")}`);
      }
    }

    let data = buildWarehouseAircraftData(body);
    data.displayName = displayName;
    data.status = saveAs === "publish" ? "published" : "draft";
    data.proformaFieldVisibility =
      body.proformaFieldVisibility ?? defaultWarehouseFieldVisibility();
    if (saveAs === "publish") data = applyPublishDefaults(data);

    const row = await prisma.warehouseAircraft.create({ data });
    return jsonOk(serializeWarehouseAircraft(row), 201);
  } catch (e) {
    return handleApiError(e);
  }
}
