import { requireDepartmentAccess } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import type {
  EmptyLegDiscountDisplayMode,
  EmptyLegLayoutStyle,
  EmptyLegPricingMode,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import {
  DEFAULT_CONSENT_TEXT,
  DEFAULT_CUSTOMER_EMAIL_TEMPLATE,
  DEFAULT_DISCLAIMER_TEXT,
  DEFAULT_INTERNAL_EMAIL_TEMPLATE,
  DEFAULT_VISIBLE_FIELDS,
} from "@/lib/charter/empty-legs/defaults";

function serialize(r: {
  id: string;
  defaultLeadRecipientEmail: string | null;
  customerConfirmationTemplate: string | null;
  internalNotificationTemplate: string | null;
  consentText: string | null;
  disclaimerText: string | null;
  brandingJson: unknown;
  promotionLabel: string;
  citySearchRadiusNm: number;
  defaultLayoutStyle: EmptyLegLayoutStyle;
  defaultVisibleFieldsJson: unknown;
  defaultPricingMode: EmptyLegPricingMode;
  defaultMinimumQuotableHours: Decimal;
  defaultDiscountPercent: Decimal | null;
  defaultDiscountDisplayMode: EmptyLegDiscountDisplayMode;
  sendCustomerConfirmation: boolean;
  lastCharterSyncAt: Date | null;
  lastCharterSyncStatus: string | null;
  lastCharterSyncStatsJson: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: r.id,
    defaultLeadRecipientEmail: r.defaultLeadRecipientEmail,
    customerConfirmationTemplate:
      r.customerConfirmationTemplate ?? DEFAULT_CUSTOMER_EMAIL_TEMPLATE,
    internalNotificationTemplate:
      r.internalNotificationTemplate ?? DEFAULT_INTERNAL_EMAIL_TEMPLATE,
    consentText: r.consentText ?? DEFAULT_CONSENT_TEXT,
    disclaimerText: r.disclaimerText ?? DEFAULT_DISCLAIMER_TEXT,
    brandingJson: r.brandingJson ?? {},
    promotionLabel: r.promotionLabel,
    citySearchRadiusNm: r.citySearchRadiusNm,
    defaultLayoutStyle: r.defaultLayoutStyle,
    defaultVisibleFieldsJson: {
      ...DEFAULT_VISIBLE_FIELDS,
      ...((r.defaultVisibleFieldsJson as object) ?? {}),
    },
    defaultPricingMode: r.defaultPricingMode,
    defaultMinimumQuotableHours: Number(r.defaultMinimumQuotableHours),
    defaultDiscountPercent:
      r.defaultDiscountPercent != null ? Number(r.defaultDiscountPercent) : null,
    defaultDiscountDisplayMode: r.defaultDiscountDisplayMode,
    sendCustomerConfirmation: r.sendCustomerConfirmation,
    lastCharterSyncAt: r.lastCharterSyncAt?.toISOString() ?? null,
    lastCharterSyncStatus: r.lastCharterSyncStatus,
    lastCharterSyncStatsJson: r.lastCharterSyncStatsJson,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

async function ensureSettings() {
  return prisma.emptyLegSettings.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });
}

export async function GET() {
  try {
    await requireDepartmentAccess("charter");
    const row = await ensureSettings();
    return jsonOk(serialize(row));
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireDepartmentAccess("charter");
    const body = await request.json();
    await ensureSettings();

    const updated = await prisma.emptyLegSettings.update({
      where: { id: "default" },
      data: {
        ...(body.defaultLeadRecipientEmail !== undefined
          ? { defaultLeadRecipientEmail: body.defaultLeadRecipientEmail || null }
          : {}),
        ...(body.customerConfirmationTemplate !== undefined
          ? { customerConfirmationTemplate: body.customerConfirmationTemplate }
          : {}),
        ...(body.internalNotificationTemplate !== undefined
          ? { internalNotificationTemplate: body.internalNotificationTemplate }
          : {}),
        ...(body.consentText !== undefined ? { consentText: body.consentText } : {}),
        ...(body.disclaimerText !== undefined
          ? { disclaimerText: body.disclaimerText }
          : {}),
        ...(body.brandingJson !== undefined ? { brandingJson: body.brandingJson } : {}),
        ...(typeof body.promotionLabel === "string"
          ? { promotionLabel: body.promotionLabel }
          : {}),
        ...(body.citySearchRadiusNm != null
          ? { citySearchRadiusNm: Number(body.citySearchRadiusNm) }
          : {}),
        ...(body.defaultLayoutStyle
          ? { defaultLayoutStyle: body.defaultLayoutStyle as EmptyLegLayoutStyle }
          : {}),
        ...(body.defaultVisibleFieldsJson !== undefined
          ? { defaultVisibleFieldsJson: body.defaultVisibleFieldsJson }
          : {}),
        ...(body.defaultPricingMode
          ? { defaultPricingMode: body.defaultPricingMode as EmptyLegPricingMode }
          : {}),
        ...(body.defaultMinimumQuotableHours != null
          ? { defaultMinimumQuotableHours: new Decimal(body.defaultMinimumQuotableHours) }
          : {}),
        ...(body.defaultDiscountPercent === null
          ? { defaultDiscountPercent: null }
          : body.defaultDiscountPercent != null
            ? { defaultDiscountPercent: new Decimal(body.defaultDiscountPercent) }
            : {}),
        ...(body.defaultDiscountDisplayMode
          ? {
              defaultDiscountDisplayMode:
                body.defaultDiscountDisplayMode as EmptyLegDiscountDisplayMode,
            }
          : {}),
        ...(typeof body.sendCustomerConfirmation === "boolean"
          ? { sendCustomerConfirmation: body.sendCustomerConfirmation }
          : {}),
      },
    });

    return jsonOk(serialize(updated));
  } catch (e) {
    return handleApiError(e);
  }
}
