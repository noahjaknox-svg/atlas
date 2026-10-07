import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { loadLineCatalog } from "@/lib/line-items";
import { customLineItemKey, isBuiltInLineItem } from "@/lib/line-item-catalog";
import { coerceKind, createLineItemSchema, SYSTEM_CALC_SOURCES, type LineItemWire } from "@/lib/line-item-api";

export async function GET() {
  try {
    await requireDepartmentAccess("data_warehouse");
    const [catalog, counts] = await Promise.all([
      loadLineCatalog(),
      prisma.aircraftTypeLineItemValue.groupBy({ by: ["lineItemId"], _count: { _all: true } }),
    ]);
    const ids = await prisma.lineItem.findMany({ select: { id: true, key: true } });
    const idByKey = new Map(ids.map((r) => [r.key, r.id]));
    const countById = new Map(counts.map((c) => [c.lineItemId, c._count._all]));
    const rows: LineItemWire[] = catalog.map((item) => {
      const builtIn = isBuiltInLineItem(item.key);
      const id = idByKey.get(item.key);
      return {
        ...item,
        builtIn,
        calculatedFrom: item.systemCalc ? SYSTEM_CALC_SOURCES[item.systemCalc] : null,
        valueCount: builtIn ? null : (id && countById.get(id)) || 0,
      };
    });
    return jsonOk({ rows });
  } catch (e) {
    return handleApiError(e);
  }
}

/** Create a custom line item (key `li_<slug>`, unique, immutable). */
export async function POST(request: Request) {
  try {
    await requireDepartmentAccess("data_warehouse");
    const parsed = createLineItemSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid line item");
    const body = parsed.data;

    const base = customLineItemKey(body.label);
    const taken = new Set(
      (await prisma.lineItem.findMany({ where: { key: { startsWith: base } }, select: { key: true } })).map((r) => r.key)
    );
    let key = base;
    for (let n = 2; taken.has(key); n++) key = `${base}_${n}`;

    const maxOrder = await prisma.lineItem.aggregate({ _max: { sortOrder: true } });
    const row = await prisma.lineItem.create({
      data: {
        key,
        label: body.label,
        section: body.section,
        kind: coerceKind(body.section, body.kind),
        appliesTo: body.section === "variable" ? body.appliesTo ?? "both" : null,
        sortOrder: body.sortOrder ?? Math.max(100, (maxOrder._max.sortOrder ?? 0) + 1),
      },
    });
    return jsonOk({ key: row.key, id: row.id }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
