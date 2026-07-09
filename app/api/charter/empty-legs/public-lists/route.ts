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

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function GET() {
  try {
    await requireDepartmentAccess("charter");
    const rows = await prisma.emptyLegPublicList.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { placements: true, leads: true } } },
    });
    return jsonOk(
      rows.map((r) => ({
        ...serializeList(r),
        placementCount: r._count.placements,
        leadCount: r._count.leads,
      }))
    );
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireDepartmentAccess("charter");
    const body = await request.json();
    if (!body.name?.trim()) return jsonError("name is required", 400);

    const name = String(body.name).trim();
    let slug = typeof body.slug === "string" && body.slug.trim() ? slugify(body.slug) : slugify(name);
    const existing = await prisma.emptyLegPublicList.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const created = await prisma.emptyLegPublicList.create({
      data: {
        name,
        slug,
        token: createPublicListToken(),
        isActive: body.isActive !== false,
        defaultPlacementStatus: (body.defaultPlacementStatus as EmptyLegPlacementStatus) ?? "needs_approval",
        layoutStyle: (body.layoutStyle as EmptyLegLayoutStyle) ?? "card_grid",
        defaultPricingMode: (body.defaultPricingMode as EmptyLegPricingMode) ?? "calculated",
        discountDisplayMode: (body.discountDisplayMode as EmptyLegDiscountDisplayMode) ?? "none",
        discountPercent:
          body.discountPercent != null ? new Decimal(body.discountPercent) : null,
        minimumQuotableHours:
          body.minimumQuotableHours != null ? new Decimal(body.minimumQuotableHours) : null,
        recipientEmailOverride: body.recipientEmailOverride ?? null,
        visibleFieldsJson: body.visibleFieldsJson ?? {},
        brandingOverrideJson: body.brandingOverrideJson ?? {},
        consentTextOverride: body.consentTextOverride ?? null,
        disclaimerOverride: body.disclaimerOverride ?? null,
      },
    });

    // Backfill placements for existing active empty legs
    const activeLegs = await prisma.emptyLeg.findMany({
      where: { lifecycleStatus: "active" },
      select: { id: true },
    });
    if (activeLegs.length > 0) {
      await prisma.emptyLegPlacement.createMany({
        data: activeLegs.map((leg) => ({
          emptyLegId: leg.id,
          publicListId: created.id,
          status: created.defaultPlacementStatus,
          pricingMode: created.defaultPricingMode,
          displayDiscountMode: created.discountDisplayMode,
        })),
        skipDuplicates: true,
      });
    }

    return jsonOk(serializeList(created), 201);
  } catch (e) {
    return handleApiError(e);
  }
}

function serializeList(r: {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  token: string;
  tokenRevokedAt: Date | null;
  defaultPlacementStatus: EmptyLegPlacementStatus;
  layoutStyle: EmptyLegLayoutStyle;
  defaultPricingMode: EmptyLegPricingMode;
  discountPercent: Decimal | null;
  discountDisplayMode: EmptyLegDiscountDisplayMode;
  minimumQuotableHours: Decimal | null;
  settingsJson: unknown;
  recipientEmailOverride: string | null;
  confirmationTemplateOverride: string | null;
  internalNotificationTemplateOverride: string | null;
  brandingOverrideJson: unknown;
  visibleFieldsJson: unknown;
  consentTextOverride: string | null;
  disclaimerOverride: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
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

export { serializeList as serializePublicList };
