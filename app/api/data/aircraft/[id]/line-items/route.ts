import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { isCustomLineItemKey } from "@/lib/line-item-catalog";
import { lineItemValuesSchema } from "@/lib/line-item-api";

/** Custom line item values for one aircraft type, keyed by `li_*` key. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireDepartmentAccess("data_warehouse");
    const { id } = await params;
    const rows = await prisma.aircraftTypeLineItemValue.findMany({
      where: { aircraftTypeId: id },
      include: { lineItem: { select: { key: true } } },
    });
    return jsonOk({ values: Object.fromEntries(rows.map((r) => [r.lineItem.key, Number(r.value)])) });
  } catch (e) {
    return handleApiError(e);
  }
}

/** Set (number) or clear (null) values. Unknown or built-in keys are rejected. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireDepartmentAccess("data_warehouse");
    const { id } = await params;
    const parsed = lineItemValuesSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("values must map line item keys to numbers or null");

    const keys = Object.keys(parsed.data.values);
    if (keys.some((k) => !isCustomLineItemKey(k))) return jsonError("Only custom (li_*) line items have values here");
    const items = await prisma.lineItem.findMany({ where: { key: { in: keys } }, select: { id: true, key: true } });
    if (items.length !== keys.length) return jsonError("Unknown line item", 404);
    if (!(await prisma.aircraftType.findUnique({ where: { id }, select: { id: true } }))) {
      return jsonError("Aircraft type not found", 404);
    }

    await prisma.$transaction(
      items.map((item) => {
        const value = parsed.data.values[item.key];
        const where = { aircraftTypeId_lineItemId: { aircraftTypeId: id, lineItemId: item.id } };
        return value === null
          ? prisma.aircraftTypeLineItemValue.deleteMany({ where: { aircraftTypeId: id, lineItemId: item.id } })
          : prisma.aircraftTypeLineItemValue.upsert({
              where,
              create: { aircraftTypeId: id, lineItemId: item.id, value },
              update: { value },
            });
      })
    );
    return jsonOk({ saved: items.length });
  } catch (e) {
    return handleApiError(e);
  }
}
