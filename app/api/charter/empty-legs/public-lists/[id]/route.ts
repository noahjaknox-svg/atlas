import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { createPublicListToken } from "@/lib/charter/empty-legs/sync";
import type {
  EmptyLegDiscountDisplayMode,
  EmptyLegLayoutStyle,
  EmptyLegPlacementStatus,
  EmptyLegPricingMode,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

function serializeList(r: Awaited<ReturnType<typeof prisma.emptyLegPublicList.findUniqueOrThrow>>) {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    isActive: r.isActive,
    token: r.token,
    tokenRevokedAt: r.tokenRevokedAt?.toISOString() ?? null,
    defaultPlacementStatus: r.defaultPlacementStatus,
    layoutStyle: r.layoutStyle,
    defaultPricingMode: r.defaultPricingMode,
    discountPercent: r.discountPercent != null ? Number(r.discountPercent) : null,
    discountDisplayMode: r.discountDisplayMode,
    minimumQuotableHours: r.minimumQuotableHours != null ? Number(r.minimumQuotableHours) : null,
    settingsJson: r.settingsJson,
    recipientEmailOverride: r.recipientEmailOverride,
    confirmationTemplateOverride: r.confirmationTemplateOverride,
    internalNotificationTemplateOverride: r.internalNotificationTemplateOverride,
    brandingOverrideJson: r.brandingOverrideJson,
    visibleFieldsJson: r.visibleFieldsJson,
    consentTextOverride: r.consentTextOverride,
    disclaimerOverride: r.disclaimerOverride,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireDepartmentAccess("charter");
    const { id } = await params;
    const row = await prisma.emptyLegPublicList.findUnique({ where: { id } });
    if (!row) return jsonError("Not found", 404);
    return jsonOk(serializeList(row));
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireDepartmentAccess("charter");
    const { id } = await params;
    const body = await request.json();
    const existing = await prisma.emptyLegPublicList.findUnique({ where: { id } });
    if (!existing) return jsonError("Not found", 404);

    const updated = await prisma.emptyLegPublicList.update({
      where: { id },
      data: {
        ...(typeof body.name === "string" ? { name: body.name.trim() } : {}),
        ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}),
        ...(body.defaultPlacementStatus
          ? { defaultPlacementStatus: body.defaultPlacementStatus as EmptyLegPlacementStatus }
          : {}),
        ...(body.layoutStyle ? { layoutStyle: body.layoutStyle as EmptyLegLayoutStyle } : {}),
        ...(body.defaultPricingMode
          ? { defaultPricingMode: body.defaultPricingMode as EmptyLegPricingMode }
          : {}),
        ...(body.discountDisplayMode
          ? { discountDisplayMode: body.discountDisplayMode as EmptyLegDiscountDisplayMode }
          : {}),
        ...(body.discountPercent === null
          ? { discountPercent: null }
          : typeof body.discountPercent === "number"
            ? { discountPercent: new Decimal(body.discountPercent) }
            : {}),
        ...(body.minimumQuotableHours === null
          ? { minimumQuotableHours: null }
          : typeof body.minimumQuotableHours === "number"
            ? { minimumQuotableHours: new Decimal(body.minimumQuotableHours) }
            : {}),
        ...(body.recipientEmailOverride !== undefined
          ? { recipientEmailOverride: body.recipientEmailOverride }
          : {}),
        ...(body.confirmationTemplateOverride !== undefined
          ? { confirmationTemplateOverride: body.confirmationTemplateOverride }
          : {}),
        ...(body.internalNotificationTemplateOverride !== undefined
          ? {
              internalNotificationTemplateOverride: body.internalNotificationTemplateOverride,
            }
          : {}),
        ...(body.visibleFieldsJson !== undefined
          ? { visibleFieldsJson: body.visibleFieldsJson }
          : {}),
        ...(body.brandingOverrideJson !== undefined
          ? { brandingOverrideJson: body.brandingOverrideJson }
          : {}),
        ...(body.consentTextOverride !== undefined
          ? { consentTextOverride: body.consentTextOverride }
          : {}),
        ...(body.disclaimerOverride !== undefined
          ? { disclaimerOverride: body.disclaimerOverride }
          : {}),
        ...(body.settingsJson !== undefined ? { settingsJson: body.settingsJson } : {}),
      },
    });

    return jsonOk(serializeList(updated));
  } catch (e) {
    return handleApiError(e);
  }
}
