import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { DEFAULT_LINE_CATALOG, isCustomLineItemKey } from "@/lib/line-item-catalog";
import { coerceKind, updateLineItemSchema } from "@/lib/line-item-api";

/**
 * Edit a line item. Built-ins: label / order / active only (stored as an override row).
 * Custom items: also kind (revenue) and appliesTo (variable).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    await requireDepartmentAccess("data_warehouse");
    const { key } = await params;
    const parsed = updateLineItemSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid line item");
    const body = parsed.data;

    const builtIn = DEFAULT_LINE_CATALOG.find((i) => i.key === key);
    if (builtIn) {
      const row = await prisma.lineItem.upsert({
        where: { key },
        create: {
          key,
          label: body.label ?? builtIn.label,
          section: builtIn.section,
          kind: builtIn.kind,
          appliesTo: builtIn.appliesTo ?? null,
          active: body.active ?? true,
          sortOrder: body.sortOrder ?? builtIn.sortOrder,
        },
        update: { label: body.label, active: body.active, sortOrder: body.sortOrder },
      });
      return jsonOk({ key: row.key });
    }

    if (!isCustomLineItemKey(key)) return jsonError("Line item not found", 404);
    const existing = await prisma.lineItem.findUnique({ where: { key } });
    if (!existing) return jsonError("Line item not found", 404);
    const section = existing.section as "revenue" | "fixed" | "variable";
    const row = await prisma.lineItem.update({
      where: { key },
      data: {
        label: body.label,
        active: body.active,
        sortOrder: body.sortOrder,
        kind: body.kind ? coerceKind(section, body.kind) : undefined,
        appliesTo: section === "variable" ? body.appliesTo : undefined,
      },
    });
    return jsonOk({ key: row.key });
  } catch (e) {
    return handleApiError(e);
  }
}

/** Delete a custom line item and its aircraft type values. Built-ins can only be deactivated. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    await requireDepartmentAccess("data_warehouse");
    const { key } = await params;
    if (!isCustomLineItemKey(key)) return jsonError("Built-in line items can be turned off, not deleted.");
    await prisma.lineItem.deleteMany({ where: { key } });
    return jsonOk({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
